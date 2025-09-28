import Together from "together-ai";
import { UIMessage } from "ai";
import { killDesktop, getDesktop } from "@/lib/e2b/utils";
import { resolution } from "@/lib/e2b/tool";
import { prunedMessages } from "@/lib/utils";

// Hardcoded API keys as required
const TOGETHER_API_KEY = "tgp_v1_JbghF6sk_yU7ks2yBrfWr3b4N183PD76xDU_K7f8GYk";
const E2B_API_KEY = "e2b_8a5c7099485b881be08b594be7b7574440adf09c";

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

const wait = async (seconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

// Function to execute computer actions
async function executeComputerAction(action: any, sandboxId: string) {
  const desktop = await getDesktop(sandboxId);

  switch (action.action) {
    case "screenshot": {
      const image = await desktop.screenshot();
      const base64Data = Buffer.from(image).toString("base64");
      return {
        type: "image" as const,
        data: `data:image/png;base64,${base64Data}`,
      };
    }
    case "wait": {
      const duration = Math.min(action.duration || 1, 2);
      await wait(duration);
      return {
        type: "text" as const,
        text: `Waited for ${duration} seconds`,
      };
    }
    case "left_click": {
      if (!action.coordinate) throw new Error("Coordinate required for left click");
      const [x, y] = action.coordinate;
      await desktop.moveMouse(x, y);
      await desktop.leftClick();
      return { type: "text" as const, text: `Left clicked at ${x}, ${y}` };
    }
    case "double_click": {
      if (!action.coordinate) throw new Error("Coordinate required for double click");
      const [x, y] = action.coordinate;
      await desktop.moveMouse(x, y);
      await desktop.doubleClick();
      return { type: "text" as const, text: `Double clicked at ${x}, ${y}` };
    }
    case "right_click": {
      if (!action.coordinate) throw new Error("Coordinate required for right click");
      const [x, y] = action.coordinate;
      await desktop.moveMouse(x, y);
      await desktop.rightClick();
      return { type: "text" as const, text: `Right clicked at ${x}, ${y}` };
    }
    case "mouse_move": {
      if (!action.coordinate) throw new Error("Coordinate required for mouse move");
      const [x, y] = action.coordinate;
      await desktop.moveMouse(x, y);
      return { type: "text" as const, text: `Moved mouse to ${x}, ${y}` };
    }
    case "type": {
      if (!action.text) throw new Error("Text required for type action");
      await desktop.write(action.text);
      return { type: "text" as const, text: `Typed: ${action.text}` };
    }
    case "key": {
      if (!action.text) throw new Error("Key required for key action");
      await desktop.press(action.text === "Return" ? "enter" : action.text);
      return { type: "text" as const, text: `Pressed key: ${action.text}` };
    }
    case "scroll": {
      if (!action.scroll_direction) throw new Error("Scroll direction required");
      if (!action.scroll_amount) throw new Error("Scroll amount required");
      await desktop.scroll(action.scroll_direction as "up" | "down", action.scroll_amount);
      return { type: "text" as const, text: `Scrolled ${action.scroll_direction} ${action.scroll_amount} units` };
    }
    case "left_click_drag": {
      if (!action.start_coordinate || !action.coordinate) throw new Error("Coordinates required for drag");
      const [startX, startY] = action.start_coordinate;
      const [endX, endY] = action.coordinate;
      await desktop.drag([startX, startY], [endX, endY]);
      return { type: "text" as const, text: `Dragged from ${startX},${startY} to ${endX},${endY}` };
    }
    case "bash": {
      if (!action.command) throw new Error("Command required for bash action");
      try {
        const result = await desktop.commands.run(action.command);
        return { type: "text" as const, text: result.stdout || "(Command executed successfully with no output)" };
      } catch (error) {
        return { type: "text" as const, text: `Error executing command: ${error instanceof Error ? error.message : String(error)}` };
      }
    }
    default:
      throw new Error(`Unsupported action: ${action.action}`);
  }
}

export async function POST(req: Request) {
  const { messages, sandboxId }: { messages: UIMessage[]; sandboxId: string } = await req.json();

  try {
    const together = new Together({
      apiKey: TOGETHER_API_KEY,
    });

    // Create a readable stream for streaming responses
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Convert messages to Together API format
          const formattedMessages = prunedMessages(messages).map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          }));

          // Add system message
          const systemMessage = {
            role: "system" as const,
            content: `You are a helpful assistant with access to a computer. You control a virtual desktop and can perform various actions.

IMPORTANT: Always start every interaction with taking a screenshot to see the current state of the desktop.

Available actions you can perform:
1. screenshot - Take a screenshot of the current desktop (ALWAYS START WITH THIS)
2. wait - Wait for a specified duration (max 2 seconds)
3. left_click - Click at coordinates [x, y]
4. double_click - Double click at coordinates [x, y]  
5. right_click - Right click at coordinates [x, y]
6. mouse_move - Move mouse to coordinates [x, y]
7. type - Type text
8. key - Press a key (like "Enter", "Tab", "Escape")
9. scroll - Scroll with direction ("up"/"down") and amount
10. left_click_drag - Drag from start_coordinate to coordinate
11. bash - Execute bash commands

Desktop resolution: ${resolution.x}x${resolution.y}

When you want to perform an action, respond with a JSON object containing the action details.
For example:
- {"action": "screenshot"}
- {"action": "left_click", "coordinate": [100, 200]}
- {"action": "type", "text": "hello world"}
- {"action": "bash", "command": "ls -la"}

Always take a screenshot first to understand the current state before performing any actions.`,
          };

          const allMessages = [systemMessage, ...formattedMessages];

          // Make streaming request to Together API
          const response = await together.chat.completions.create({
            model: "Qwen/Qwen2.5-VL-72B-Instruct",
            messages: allMessages,
            stream: true,
            max_tokens: 2048,
          });

          let currentContent = "";
          let isCollectingAction = false;
          let actionBuffer = "";

          for await (const chunk of response) {
            if (chunk.choices[0]?.delta?.content) {
              const content = chunk.choices[0].delta.content;
              currentContent += content;

              // Check if we're starting to collect an action (JSON object)
              if (content.includes("{") && (content.includes('"action"') || actionBuffer)) {
                isCollectingAction = true;
                actionBuffer += content;
              } else if (isCollectingAction) {
                actionBuffer += content;
              } else {
                // Stream regular text content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: "text", 
                  content 
                })}\n\n`));
              }

              // Check if we have a complete action JSON
              if (isCollectingAction && actionBuffer.includes("}")) {
                try {
                  // Find the JSON object in the buffer
                  const startIndex = actionBuffer.indexOf("{");
                  const endIndex = actionBuffer.lastIndexOf("}") + 1;
                  const jsonString = actionBuffer.substring(startIndex, endIndex);
                  
                  const action = JSON.parse(jsonString);
                  
                  if (action.action) {
                    // Execute the action
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      type: "action_start", 
                      action: action.action,
                      details: action
                    })}\n\n`));

                    const result = await executeComputerAction(action, sandboxId);
                    
                    if (result.type === "image") {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: "image", 
                        data: result.data
                      })}\n\n`));
                    } else {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: "action_result", 
                        content: result.text
                      })}\n\n`));
                    }
                  }
                } catch (parseError) {
                  console.error("Error parsing action JSON:", parseError);
                  // Continue collecting if JSON is incomplete
                  if (!actionBuffer.includes("}")) {
                    continue;
                  }
                }
                
                isCollectingAction = false;
                actionBuffer = "";
              }
            }
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: "error", 
            content: "An error occurred with the AI service. Please try again."
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    await killDesktop(sandboxId);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
