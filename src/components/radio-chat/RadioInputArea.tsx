import { cn } from '@/lib/utils';
import { RadioMessageInput } from './RadioMessageInput';
import { RadioSendButton } from './RadioSendButton';

interface RadioInputAreaProps {
  inputVisible: boolean;
  inputValue: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  onClose: () => void;
}

export const RadioInputArea = ({
  inputVisible, inputValue, onChange, onSubmit, isSending, onClose
}: RadioInputAreaProps) => {
  if (!inputVisible) return null;

  return (
    <div className="fixed bottom-[30px] left-0 right-0 h-[200px] z-30 bg-gradient-to-t from-background via-background/80 to-transparent p-4 animate-in slide-in-from-bottom-4 duration-200">
      <div className="w-[90%] max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto relative h-full">
        {isSending && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-lg z-10">
            <div className="text-foreground">Invio in corso...</div>
          </div>
        )}
        <RadioMessageInput
          value={inputValue}
          onChange={onChange}
          onSubmit={onSubmit}
          onClose={onClose}
          disabled={isSending}
          className="h-full"
        />
        <RadioSendButton
          onSend={onSubmit}
          disabled={!inputValue.trim() || isSending}
          visible={inputValue.trim().length > 0}
        />
      </div>
    </div>
  );
};
