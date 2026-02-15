import { cn } from '@/lib/utils';
import { RadioCarousel3D } from './RadioCarousel3D';
import { RadioMessageView } from './RadioMessageView';
import { FloatingZoomControl } from '@/components/email/management/FloatingZoomControl';
import { RadioMessage } from '@/types/radio';

// Import avatar assets
import albertGif from '@/assets/albert-mining.gif';
import albertStatic from '@/assets/albert-static.png';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import pitagoraStatic from '@/assets/pitagora-static.png';
import archimedeGif from '@/assets/archimede-stones.gif';
import archimedeStatic from '@/assets/archimede-static.png';

const avatarConfig = {
  chatgpt: { gif: albertGif, static: albertStatic, name: 'Albert' },
  gemini: { gif: pitagoraGif, static: pitagoraStatic, name: 'Pitagora' },
  claude: { gif: archimedeGif, static: archimedeStatic, name: 'Archimede' }
};

interface RadioCarouselContainerProps {
  messages: RadioMessage[];
  aiMessages: RadioMessage[];
  activeMessageId: string;
  setActiveMessageId: (id: string) => void;
  currentMessage: RadioMessage | null;
  messageViewVisible: boolean;
  carouselZoom: number;
  setCarouselZoom: (z: number) => void;
  carouselVerticalOffset: number;
  setCarouselVerticalOffset: (o: number) => void;
  sidebarOpen: boolean;
  crmMenuOpen: boolean;
  // Navigation
  handlePrevCard: () => void;
  handleNextCard: () => void;
  handleCarouselAudioEnd: () => void;
  touchHandlers: {
    handleTouchStart: (e: React.TouchEvent) => void;
    handleTouchMove: (e: React.TouchEvent) => void;
    handleTouchEnd: () => void;
  };
  handleWheel: (e: React.WheelEvent) => void;
  // Audio
  isAudioEnabled: boolean;
  handleAudioStart: (id: string) => void;
}

export const RadioCarouselContainer = ({
  messages, aiMessages, activeMessageId, setActiveMessageId, currentMessage,
  messageViewVisible, carouselZoom, setCarouselZoom, carouselVerticalOffset, setCarouselVerticalOffset,
  sidebarOpen, crmMenuOpen,
  handlePrevCard, handleNextCard, handleCarouselAudioEnd,
  touchHandlers, handleWheel,
  isAudioEnabled, handleAudioStart
}: RadioCarouselContainerProps) => {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] md:min-h-[700px] lg:min-h-[850px]">
      <div
        className="relative flex-1 min-h-0 overflow-visible"
        onTouchStart={touchHandlers.handleTouchStart}
        onTouchMove={touchHandlers.handleTouchMove}
        onTouchEnd={touchHandlers.handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Carousel 3D */}
        <div className="absolute inset-0 z-10">
          <RadioCarousel3D
            messages={messages}
            activeMessageId={activeMessageId}
            zoom={carouselZoom}
            verticalOffset={carouselVerticalOffset}
          />
        </div>

        {/* Zoom Controls */}
        {!sidebarOpen && !crmMenuOpen && (
          <FloatingZoomControl
            zoom={carouselZoom}
            onZoomChange={setCarouselZoom}
            verticalOffset={carouselVerticalOffset}
            onVerticalOffsetChange={setCarouselVerticalOffset}
            position="left"
          />
        )}

        {/* Clickable navigation areas */}
        {aiMessages.length > 1 && (
          <>
            <button onClick={handlePrevCard} className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer" aria-label="Previous message" />
            <button onClick={handleNextCard} className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer" aria-label="Next message" />
          </>
        )}

        {/* Avatar Navigation Column */}
        {aiMessages.length > 1 && (
          <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-30 flex-col gap-4">
            {aiMessages.map((msg) => {
              const isActive = msg.id === activeMessageId;
              const agentType = msg.sender_type === 'human' ? 'chatgpt' : msg.sender_type;
              const config = avatarConfig[agentType as keyof typeof avatarConfig] || avatarConfig.chatgpt;

              return (
                <button
                  key={msg.id}
                  onClick={() => setActiveMessageId(msg.id)}
                  className={cn(
                    "relative w-14 h-14 rounded-full overflow-hidden transition-all duration-300 cursor-pointer shadow-lg",
                    isActive ? "scale-110 shadow-primary/40" : "opacity-50 hover:opacity-80 hover:scale-105"
                  )}
                  aria-label={`Go to ${config.name}'s message`}
                  title={config.name}
                >
                  <img
                    src={isActive ? config.gif : config.static}
                    alt={config.name}
                    className={cn("w-full h-full object-cover transition-all", !isActive && "grayscale brightness-75")}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Message View overlay */}
        {messageViewVisible && currentMessage ? (
          <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[40%] overflow-y-auto bg-gradient-to-t from-background via-background/95 to-transparent p-6 animate-in slide-in-from-bottom-4 duration-200">
            <RadioMessageView
              message={currentMessage}
              onAudioEnd={handleCarouselAudioEnd}
              onAudioStart={(msgId) => handleAudioStart(msgId)}
              isAudioEnabled={isAudioEnabled}
              canAutoPlay={true}
              showAudioPlayer={false}
            />
          </div>
        ) : messages.length > 0 && !currentMessage && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 text-center text-muted-foreground/50">
            Invia un messaggio per iniziare
          </div>
        )}
      </div>
    </div>
  );
};
