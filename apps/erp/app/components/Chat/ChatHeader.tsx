import { ChatNavigation } from "./ChatNavigation";
import { ChatTitle } from "./ChatTitle";

export function ChatHeader() {
  return (
    <div className="flex items-center justify-start pl-9 relative h-8">
      <ChatNavigation />
      <ChatTitle />
    </div>
  );
}
