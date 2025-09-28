import { motion } from "motion/react";
import { VercelIcon } from "./icons";
import { ComputerIcon } from "lucide-react";
import Link from "next/link";

export const ProjectInfo = () => {
  return (
    <motion.div className="w-full px-4">
      <div className="rounded-lg border-border border p-6 flex flex-col gap-4 text-center text-base dark:text-zinc-400">
        <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
          <VercelIcon size={16} />
          <span>+</span>
          <ComputerIcon />
        </p>
        <h3 className="text-center text-2xl font-bold">Computer Use Agent</h3>
        <p>
          This demo showcases a Computer Use Agent built with{" "}
          <StyledLink href="https://www.together.ai">Together AI</StyledLink>,{" "}
          <StyledLink href="https://huggingface.co/Qwen/Qwen2.5-VL-72B-Instruct">
            Qwen/Qwen2.5-VL-72B-Instruct
          </StyledLink>
          , and <StyledLink href="https://e2b.dev">e2b desktop</StyledLink>.
        </p>
        <p>
          {" "}
          Learn more about{" "}
          <Link
            className="text-blue-500 dark:text-blue-400"
            href="https://www.together.ai"
            target="_blank"
          >
            Together AI{" "}
          </Link>
          and Qwen models.
        </p>
      </div>
    </motion.div>
  );
};

const StyledLink = ({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <Link
      className="text-blue-500 dark:text-blue-400"
      href={href}
      target="_blank"
    >
      {children}
    </Link>
  );
};

// const Code = ({ text }: { text: string }) => {
//   return <code className="">{text}</code>;
// };

export const DeployButton = () => {
  return (
    <Link
      target="_blank"
      href={`https://vercel.com/new/clone?project-name=AI+Qwen+Computer+Use+Demo&repository-name=ai-qwen-computer-use&repository-url=https%3A%2F%2Fgithub.com%2Fopenapiv1%2Faisdkqwenvl&demo-title=AI+Qwen+Computer+Use+Demo&demo-url=&demo-description=A+chatbot+application+built+with+Next.js+demonstrating+Qwen2.5-VL-72B-Instruct%27s+computer+use+capabilities&env=TOGETHER_API_KEY,E2B_API_KEY`}
      className="flex flex-row gap-2 items-center bg-zinc-900 px-3 py-2 rounded-md text-zinc-50 hover:bg-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-50"
    >
      <VercelIcon size={14} />
      Deploy
    </Link>
  );
};
