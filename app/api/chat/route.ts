import Together from "together-ai";
import { killDesktop, getDesktop } from "@/lib/e2b/utils";
import { prunedMessages } from "@/lib/utils";

// Resolution configuration
const resolution = { x: 1024, y: 768 };

// Hardcoded API keys as required
const TOGETHER_API_KEY = "tgp_v1_JbghF6sk_yU7ks2yBrfWr3b4N183PD76xDU_K7f8GYk";

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

const wait = async (seconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

// Computer action executor
async function executeComputerAction(
  action: string,
  args: Record<string, unknown>,
  sandboxId: string
): Promise<string> {
  const desktop = await getDesktop(sandboxId);

  switch (action) {
    case "screenshot": {
      const image = await desktop.screenshot();
      const base64Data = Buffer.from(image).toString("base64");
      return `Screenshot captured successfully.\n\n![Desktop Screenshot](data:image/png;base64,${base64Data})`;
    }
    case "wait": {
      const duration = Math.min((args.duration as number) || 1, 2);
      await wait(duration);
      return `Waited for ${duration} seconds`;
    }
    case "left_click": {
      if (!args.coordinate) throw new Error("Coordinate [x, y] required for left click");
      const [x, y] = args.coordinate as [number, number];
      await desktop.moveMouse(x, y);
      await desktop.leftClick();
      return `Left clicked at coordinates (${x}, ${y})`;
    }
    case "double_click": {
      if (!args.coordinate) throw new Error("Coordinate [x, y] required for double click");
      const [x, y] = args.coordinate as [number, number];
      await desktop.moveMouse(x, y);
      await desktop.doubleClick();
      return `Double clicked at coordinates (${x}, ${y})`;
    }
    case "right_click": {
      if (!args.coordinate) throw new Error("Coordinate [x, y] required for right click");
      const [x, y] = args.coordinate as [number, number];
      await desktop.moveMouse(x, y);
      await desktop.rightClick();
      return `Right clicked at coordinates (${x}, ${y})`;
    }
    case "mouse_move": {
      if (!args.coordinate) throw new Error("Coordinate [x, y] required for mouse move");
      const [x, y] = args.coordinate as [number, number];
      await desktop.moveMouse(x, y);
      return `Moved mouse to coordinates (${x}, ${y})`;
    }
    case "type": {
      if (!args.text) throw new Error("Text required for type action");
      await desktop.write(args.text as string);
      return `Typed text: "${args.text}"`;
    }
    case "key": {
      if (!args.text) throw new Error("Key required for key action");
      const key = args.text === "Return" ? "enter" : (args.text as string);
      await desktop.press(key);
      return `Pressed key: ${args.text}`;
    }
    case "scroll": {
      if (!args.scroll_direction) throw new Error("Scroll direction (up/down) required");
      if (!args.scroll_amount) throw new Error("Scroll amount required");
      await desktop.scroll(args.scroll_direction as "up" | "down", args.scroll_amount as number);
      return `Scrolled ${args.scroll_direction} by ${args.scroll_amount} units`;
    }
    case "left_click_drag": {
      if (!args.start_coordinate || !args.coordinate) {
        throw new Error("Both start_coordinate and coordinate required for drag action");
      }
      const [startX, startY] = args.start_coordinate as [number, number];
      const [endX, endY] = args.coordinate as [number, number];
      await desktop.drag([startX, startY], [endX, endY]);
      return `Dragged from (${startX}, ${startY}) to (${endX}, ${endY})`;
    }
    case "bash": {
      if (!args.command) throw new Error("Command required for bash action");
      try {
        const result = await desktop.commands.run(args.command as string);
        const output = result.stdout || result.stderr || "(Command executed with no output)";
        return `Command executed: ${args.command}\n\nOutput:\n\`\`\`\n${output}\n\`\`\``;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return `Error executing command "${args.command}": ${errorMsg}`;
      }
    }
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

function parseToolCall(content: string): { action: string; args: Record<string, unknown> } | null {
  // Try to find JSON tool calls in the content
  const toolCallRegex = /\{"action":\s*"([^"]+)"[^}]*\}/g;
  const match = toolCallRegex.exec(content);
  
  if (match) {
    try {
      const toolCall = JSON.parse(match[0]);
      return {
        action: toolCall.action,
        args: toolCall
      };
    } catch {
      // If JSON parsing fails, return null
      return null;
    }
  }
  
  return null;
}

export async function POST(req: Request) {
  const { messages, sandboxId } = await req.json();

  try {
    const together = new Together({ apiKey: TOGETHER_API_KEY });

    // Convert messages to Together API format
    const formattedMessages = prunedMessages(messages).map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    // Add system message with instructions
    const systemMessage = {
      role: "system" as const,
      content: `You are a helpful AI assistant that can control a virtual desktop computer. You have access to a computer with resolution ${resolution.x}x${resolution.y}.

CRITICAL WORKFLOW:
1. ALWAYS start every interaction by taking a screenshot to see the current state
2. Analyze what you see in the screenshot
3. Plan your actions based on the current state
4. Execute the necessary actions step by step
5. Take another screenshot after significant actions to verify the results

Available actions (use JSON format):
- {"action": "screenshot"} - Take a screenshot to see the current desktop state
- {"action": "wait", "duration": 1.5} - Wait for specified seconds (max 2)
- {"action": "left_click", "coordinate": [x, y]} - Left click at coordinates
- {"action": "double_click", "coordinate": [x, y]} - Double click at coordinates
- {"action": "right_click", "coordinate": [x, y]} - Right click at coordinates
- {"action": "mouse_move", "coordinate": [x, y]} - Move mouse to coordinates
- {"action": "type", "text": "hello world"} - Type text into focused element
- {"action": "key", "text": "Enter"} - Press a key (Enter, Tab, Escape, etc.)
- {"action": "scroll", "scroll_direction": "up", "scroll_amount": 3} - Scroll up/down
- {"action": "left_click_drag", "start_coordinate": [x1, y1], "coordinate": [x2, y2]} - Drag operation
- {"action": "bash", "command": "ls -la"} - Execute bash command

ALWAYS start with taking a screenshot to understand the current state. When you want to perform an action, include the JSON action in your response.`,
    };

    const allMessages = [systemMessage, ...formattedMessages];

    // Create streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await together.chat.completions.create({
            model: "Qwen/Qwen2.5-VL-72B-Instruct",
            messages: allMessages,
            stream: true,
            max_tokens: 4000,
          });

          let accumulatedContent = "";
          let actionExecuted = false;

          for await (const chunk of response) {
            if (chunk.choices[0]?.delta?.content) {
              const content = chunk.choices[0].delta.content;
              accumulatedContent += content;

              // Stream the text content immediately
              controller.enqueue(encoder.encode(`0:"${content}"\n`));

              // Check if we have a complete tool call
              const toolCall = parseToolCall(accumulatedContent);
              if (toolCall && !actionExecuted) {
                actionExecuted = true;
                
                try {
                  // Execute the action
                  controller.enqueue(encoder.encode(`8:[{"toolCallType":"function","toolCallId":"call_1","toolName":"computer","args":${JSON.stringify(toolCall.args)}}]\n`));
                  
                  const result = await executeComputerAction(toolCall.action, toolCall.args, sandboxId);
                  
                  // Send the result
                  controller.enqueue(encoder.encode(`9:[{"toolCallId":"call_1","result":"${result.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}]\n`));
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : String(error);
                  controller.enqueue(encoder.encode(`9:[{"toolCallId":"call_1","result":"Error: ${errorMsg}"}]\n`));
                }
              }
            }
          }

          controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(encoder.encode(`0:"Error occurred during processing. Please try again."\n`));
          controller.enqueue(encoder.encode(`d:{"finishReason":"error","usage":{"promptTokens":0,"completionTokens":0}}\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
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
