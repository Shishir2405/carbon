import { SUPABASE_URL, useCarbon } from "@carbon/auth";
import type { ShortcutDefinition } from "@carbon/react";
import {
  Badge,
  Button,
  cn,
  CodeBlock,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuIcon,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ShortcutKey,
  toast,
  useDisclosure,
  useShortcutKeys,
} from "@carbon/react";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCircleStop,
  LuRotateCcw,
  LuShoppingCart,
  LuSparkles,
  LuWrench,
} from "react-icons/lu";
import { EmployeeAvatar } from "~/components";
import { useUser } from "~/hooks/useUser";
import { camelCaseToWords } from "~/utils/string";
import SYSTEM_PROMPT from "./system.ee.txt?raw";

const shortcut: ShortcutDefinition = {
  key: "I",
  modifiers: ["mod"],
};

type Message = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
};

type Step = {
  type: string;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
    result: any;
  }>;
  text?: string;
};

function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  textareaRef,
  isInitial,
  onStop,
  onClear,
  className,
}: {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (message: string) => void;
  isLoading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isInitial: boolean;
  onClear: () => void;
  onStop: () => void;
  className?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          onSubmit(input);
          setInput("");
        }
      }}
      className={cn("p-2", className)}
    >
      <div className="bg-card rounded-xl md:rounded-lg text-base min-h-20 md:min-h-[60px] border">
        <div className="flex flex-col items-center justify-center w-full">
          <div className="relative w-full">
            <textarea
              ref={textareaRef}
              autoFocus
              disabled={isLoading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  if (input.trim()) {
                    onSubmit(input);
                    setInput("");
                  }
                }
              }}
              className="w-full py-4 bg-transparent border-none resize-none outline-none text-foreground p-4 md:p-3"
              placeholder={
                isLoading ? "Thinking..." : "What can I help you with?"
              }
            />
            {isLoading && (
              <IconButton
                aria-label="Stop"
                icon={<LuCircleStop />}
                variant="ghost"
                onClick={onStop}
                className="absolute right-2 top-2 rounded-full before:rounded-full before:absolute before:inset-0 before:bg-background"
              />
            )}
          </div>
          <HStack className="w-full justify-between p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  rightIcon={<LuChevronDown />}
                >
                  Purchasing Agent{" "}
                  <ShortcutKey variant="small" shortcut={shortcut} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>
                  <DropdownMenuIcon icon={<LuShoppingCart />} />
                  <span>Purchasing Agent</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!isInitial && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<LuRotateCcw />}
                onClick={onClear}
              >
                Clear
              </Button>
            )}
          </HStack>
        </div>
      </div>
    </form>
  );
}

export function Agent() {
  const agentModal = useDisclosure();

  useShortcutKeys({
    shortcut: shortcut,
    action: agentModal.onOpen,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { accessToken } = useCarbon();
  const {
    id: userId,
    company: { id: companyId },
  } = useUser();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "system-1",
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      id: "system-2",
      role: "system",
      content: `The current date is ${new Date().toDateString()}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (rootRef.current) {
      const scrollHeight = rootRef.current.scrollHeight;
      rootRef.current.scrollTo({
        top: scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, steps]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoading) {
        stop();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLoading]);

  function stop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }

  async function sendMessage(userMessage: string) {
    if (!accessToken || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setSteps([]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "x-company-id": companyId,
          "x-user-id": userId,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const result = await response.json();
      console.log("Agent response:", result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Add assistant response
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.text || "",
      };

      setMessages([...newMessages, assistantMsg]);
      setSteps(result.steps || []);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Agent error:", error);
        toast.error(
          error.message || "Failed to send message. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  function clearConversation() {
    setMessages([
      {
        id: "system-1",
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        id: "system-2",
        role: "system",
        content: `The current date is ${new Date().toDateString()}`,
      },
    ]);
    setInput("");
    setSteps([]);
  }

  const isInitialState = messages.length === 2;

  return (
    <Popover
      onOpenChange={(open: boolean) => {
        if (!open) {
          agentModal.onClose();
        } else {
          agentModal.onOpen();
        }
      }}
      open={agentModal.isOpen}
    >
      <PopoverTrigger asChild>
        <IconButton variant="ghost" icon={<LuSparkles />} aria-label="Agent" />
      </PopoverTrigger>
      <PopoverContent
        className="h-[calc(100vh-52px)] w-screen md:w-[480px] p-0 overflow-hidden flex flex-col"
        align="center"
        sideOffset={10}
      >
        {isInitialState && (
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={sendMessage}
            isLoading={isLoading}
            textareaRef={textareaRef}
            isInitial={true}
            onClear={clearConversation}
            onStop={stop}
          />
        )}

        <div ref={rootRef} className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-y-4">
            {messages.map((message: Message, index: number) => (
              <Fragment key={message.id}>
                {message.role === "user" && (
                  <div className="flex items-center gap-x-2 p-3 rounded-lg bg-card border">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center">
                      <EmployeeAvatar employeeId={userId} withName={false} />
                    </div>
                    <div className="whitespace-pre-wrap flex-1">
                      {message.content}
                    </div>
                  </div>
                )}

                {message.role === "assistant" && message.content && (
                  <div className="whitespace-pre-wrap text-foreground px-1">
                    {message.content}
                  </div>
                )}

                {message.role === "system" && index > 1 && (
                  <div className="whitespace-pre-wrap p-3 rounded-lg border italic opacity-80">
                    {message.content}
                  </div>
                )}
              </Fragment>
            ))}

            {/* Show tool executions from steps */}
            {steps.map((step: Step, stepIndex: number) => (
              <Fragment key={`step-${stepIndex}`}>
                {step.toolResults?.map((toolResult: any) => (
                  <ToolExecution
                    key={toolResult.toolCallId}
                    toolResult={toolResult}
                  />
                ))}
              </Fragment>
            ))}

            {isLoading && (
              <div className="w-full max-w-[480px] my-3  flex items-center mx-auto">
                <div className="w-[18px] h-[18px] mr-3 relative">
                  <div className="absolute w-full h-full rounded-full border-2 border-transparent border-t-muted-foreground border-b-muted animate-[thinking-spin-outer_1.5s_cubic-bezier(0.6,0.2,0.4,0.8)_infinite]">
                    <div className="absolute inset-[2px] rounded-full border-2 border-transparent border-l-muted border-r-muted-foreground animate-[thinking-spin-inner_0.8s_cubic-bezier(0.3,0.7,0.7,0.3)_infinite]"></div>
                  </div>
                </div>
                <div className="text-muted-foreground">Thinking</div>
              </div>
            )}
          </div>
        </div>

        {!isInitialState && (
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={sendMessage}
            isLoading={isLoading}
            textareaRef={textareaRef}
            isInitial={false}
            onClear={clearConversation}
            onStop={stop}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function ToolExecution({
  toolResult,
}: {
  toolResult: {
    toolCallId: string;
    toolName: string;
    args: any;
    result: any;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-card hover:bg-card/80 p-3 rounded-lg border">
      <div
        className="flex justify-between items-center h-9 md:h-8 w-full relative cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="font-mono ml-1">
            <LuWrench className="mr-1" />
            {camelCaseToWords(toolResult.toolName)}
          </Badge>
          <LuCheck className="text-emerald-500" />
        </div>
        <LuChevronRight
          className={cn(
            "transition-transform duration-200",
            isExpanded ? "rotate-90" : "rotate-0"
          )}
        />
      </div>
      {isExpanded && (
        <div className="mt-4 p-2 md:p-1.5">
          <div className="mb-2 text-sm text-muted-foreground">Parameters:</div>
          <CodeBlock
            className="language-json"
            parentClassName="max-h-[300px] md:max-h-[200px] overflow-y-auto"
          >
            {JSON.stringify(toolResult.args, null, 2)}
          </CodeBlock>

          {toolResult.result && (
            <>
              <div className="mt-3 mb-2 text-sm text-muted-foreground">
                Result:
              </div>
              <CodeBlock
                className="language-json"
                parentClassName="max-h-[300px] md:max-h-[200px] overflow-y-auto"
              >
                {typeof toolResult.result === "string"
                  ? toolResult.result
                  : JSON.stringify(toolResult.result, null, 2)}
              </CodeBlock>
            </>
          )}
        </div>
      )}
    </div>
  );
}
