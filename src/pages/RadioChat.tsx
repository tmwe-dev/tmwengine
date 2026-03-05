import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useCRMLayout } from '@/contexts/CRMLayoutContext';
import { useGlobalAICanvas } from '@/hooks/useGlobalAICanvas';
import { useRadioAudioPlayback } from '@/hooks/useRadioAudioPlayback';
import { useAudioPreference } from '@/hooks/useAudioPreference';
import { RadioAudioPlayerProvider } from '@/contexts/RadioAudioPlayerContext';
import { RadioChatProvider } from '@/contexts/RadioChatContext';

// Hooks modulari
import { useRadioAuth } from '@/hooks/useRadioAuth';
import { useRadioParticipants } from '@/hooks/useRadioParticipants';
import { useRadioConversations } from '@/hooks/useRadioConversations';
import { useRadioMessages } from '@/hooks/useRadioMessages';
import { useRadioSendMessage } from '@/hooks/useRadioSendMessage';
import { useRadioPromptCache } from '@/hooks/useRadioPromptCache';
import { useRadioSummary } from '@/hooks/useRadioSummary';
import { useRadioCarouselNav } from '@/hooks/useRadioCarouselNav';
import { useRadioPreferences } from '@/hooks/useRadioPreferences';
import { useRadioUIState } from '@/hooks/useRadioUIState';

// Componenti modulari
import { RadioLayout } from '@/components/radio-chat/RadioLayout';
import { RadioSidebarPanel } from '@/components/radio-chat/RadioSidebarPanel';
import { RadioGhostIcons } from '@/components/radio-chat/RadioGhostIcons';
import { RadioCarouselContainer } from '@/components/radio-chat/RadioCarouselContainer';
import { RadioInputArea } from '@/components/radio-chat/RadioInputArea';
import { RadioDebugPanel } from '@/components/radio-chat/RadioDebugPanel';
import { RadioMessagesView } from '@/components/radio-chat/RadioMessagesView';
import { MessageTabsView } from '@/components/chat-laboratory/MessageTabsView';
import { RadioCarouselAudioPlayerWrapper } from '@/components/radio-chat/RadioCarouselAudioPlayerWrapper';
import { RadioAudioControls } from '@/components/radio-chat/RadioAudioControls';
import { SidebarPortal } from '@/components/layout/SidebarPortal';
import { SidebarFooterPortal } from '@/components/layout/SidebarFooterPortal';

const RadioChat = () => (
  <RadioAudioPlayerProvider>
    <RadioChatContent />
  </RadioAudioPlayerProvider>
);

const RadioChatContent = () => {
  // 🔴 Unified sidebar: menuOpen controls the single CRM sidebar
  const { menuOpen, setMenuOpen } = useCRMLayout();
  const { state: aiCanvasState } = useGlobalAICanvas();
  const { isAudioEnabled } = useAudioPreference();
  const [inputValue, setInputValue] = useState('');

  // Hook modulari
  const { currentUser } = useRadioAuth();
  const { participants, toggleParticipant } = useRadioParticipants();
  const {
    conversations, currentConversationId, setConversationId,
    loadConversations, selectConversation, createConversation,
    createQuickConversation, deleteConversation, updateTitle
  } = useRadioConversations(currentUser?.id);
  const { messages, isSending, setIsSending, loadMessages, clearMessages } = useRadioMessages(currentConversationId);
  const preferences = useRadioPreferences();
  const ui = useRadioUIState();
  const { cachedPrompts, loadCachedPrompts } = useRadioPromptCache();
  const { sendMessage } = useRadioSendMessage({
    currentConversationId, setConversationId: setConversationId,
    createQuickConversation, participants, setIsSending, cachedPrompts
  });
  const { generateSummary, generateFullReport } = useRadioSummary(loadConversations);
  const {
    isAudioPlaying, currentPlayingId, audioElementRef, handleAudioStart, handleAudioEnd, handleAudioError, stopCurrentAudio
  } = useRadioAudioPlayback();
  const {
    activeMessageId, setActiveMessageId, currentMessage, aiMessages,
    resetNavigation, handleCarouselAudioEnd, handlePrevCard, handleNextCard,
    touchHandlers, handleWheel
  } = useRadioCarouselNav(messages, isAudioPlaying, stopCurrentAudio, handleAudioEnd, preferences.isAutoAdvanceEnabled);

  // Stop audio on view change
  useEffect(() => {
    console.log(`🔄 [RadioChat] View changed to: ${preferences.viewMode}, stopping audio`);
    stopCurrentAudio();
  }, [preferences.viewMode, stopCurrentAudio]);

  // Load conversations on user ready
  useEffect(() => {
    if (!currentUser) return;
    loadConversations();
  }, [currentUser, loadConversations]);

  // When a conversation is selected, load its messages & prompts
  useEffect(() => {
    if (!currentConversationId) return;
    loadMessages(currentConversationId);
    loadCachedPrompts(currentConversationId);
  }, [currentConversationId, loadMessages, loadCachedPrompts]);

  // Handle conversation selection — closes unified sidebar
  const handleSelectConversation = useCallback(async (conversationId: string) => {
    stopCurrentAudio();
    selectConversation(conversationId);
    resetNavigation();
    setMenuOpen(false);
  }, [selectConversation, resetNavigation, stopCurrentAudio, setMenuOpen]);

  // Handle new conversation — closes unified sidebar
  const handleNewConversation = useCallback(async () => {
    stopCurrentAudio();
    const newId = await createConversation();
    if (newId) {
      resetNavigation();
      clearMessages();
      setInputValue('');
      ui.setInputVisible(false);
      ui.setMessageViewVisible(false);
      loadCachedPrompts(newId);
      setMenuOpen(false);
    }
  }, [createConversation, resetNavigation, clearMessages, stopCurrentAudio, loadCachedPrompts, ui, setMenuOpen]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    const msg = inputValue;
    setInputValue('');
    ui.setInputVisible(false);
    await sendMessage(msg);
  }, [inputValue, isSending, sendMessage, ui]);

  // Unified audio callbacks for Tabs/Messages views
  const handleTabsAudioStart = useCallback((messageId: string) => {
    handleAudioStart(messageId);
  }, [handleAudioStart]);

  const handleTabsAudioEnd = useCallback(() => {
    handleAudioEnd();
  }, [handleAudioEnd]);

  // Context value — sidebarOpen/crmMenuOpen both map to unified menuOpen
  const contextValue = {
    sidebarOpen: menuOpen,
    setSidebarOpen: setMenuOpen,
    aiSidebarOpen: ui.aiSidebarOpen,
    setAiSidebarOpen: ui.setAiSidebarOpen,
    messageViewVisible: ui.messageViewVisible,
    setMessageViewVisible: ui.setMessageViewVisible,
    showAudioControls: ui.showAudioControls,
    setShowAudioControls: ui.setShowAudioControls,
    inputVisible: ui.inputVisible,
    setInputVisible: ui.setInputVisible,
    shouldShowLeftIcons: ui.shouldShowLeftIcons || menuOpen,
    crmMenuOpen: menuOpen,
    setCrmMenuOpen: setMenuOpen,
    aiCanvasHasMessages: aiCanvasState.messages.length > 0,
    isAudioEnabled,
    isAutoAdvanceEnabled: preferences.isAutoAdvanceEnabled,
    viewMode: preferences.viewMode,
  };

  return (
    <RadioChatProvider value={contextValue}>
      <RadioLayout
        sidebar={
          <SidebarPortal>
            <RadioSidebarPanel
              activeSidebarTab={ui.activeSidebarTab}
              setActiveSidebarTab={ui.setActiveSidebarTab}
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={deleteConversation}
              onUpdateTitle={updateTitle}
              onGenerateSummary={generateSummary}
              onGenerateFullReport={generateFullReport}
              conversationId={currentConversationId}
              viewMode={preferences.viewMode}
              onViewModeChange={preferences.setViewMode}
              isAutoAdvanceEnabled={preferences.isAutoAdvanceEnabled}
              onAutoAdvanceChange={preferences.setIsAutoAdvanceEnabled}
              participants={participants}
              onToggleParticipant={toggleParticipant}
              carouselZoom={preferences.carouselZoom}
              onCarouselZoomChange={preferences.handleZoomChange}
              onClose={() => setMenuOpen(false)}
              crmMenuOpen={menuOpen}
              setCrmMenuOpen={setMenuOpen}
            />
          </SidebarPortal>
        }
        ghostIcons={
          <SidebarFooterPortal>
            <RadioGhostIcons currentMessage={currentMessage} />
          </SidebarFooterPortal>
        }
        mainContent={
          <>
            {/* Central Input Zone */}
            <div
              onMouseEnter={() => ui.setIsHoveringInputZone(true)}
              onMouseLeave={() => ui.setIsHoveringInputZone(false)}
              onDoubleClick={() => ui.setInputVisible(true)}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 w-[300px] h-[150px]"
              style={{
                cursor: ui.isHoveringInputZone
                  ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2322d3ee' stroke-width='2'%3E%3Cpath d='M10 8h.01M14 8h.01M8 12h.01M12 12h.01M16 12h.01M9 16h6M6 4h12c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/%3E%3C/svg%3E") 12 12, pointer`
                  : 'default'
              }}
              aria-label="Double click to open text input"
            />

            <div className="pt-4 pb-[200px]">
              {/* Conditional mount — only active view exists in DOM */}

              {preferences.viewMode === 'carousel' && (
                <RadioCarouselContainer
                  messages={messages}
                  aiMessages={aiMessages}
                  activeMessageId={activeMessageId}
                  setActiveMessageId={setActiveMessageId}
                  currentMessage={currentMessage}
                  messageViewVisible={ui.messageViewVisible}
                  carouselZoom={preferences.carouselZoom}
                  setCarouselZoom={preferences.setCarouselZoom}
                  carouselVerticalOffset={preferences.carouselVerticalOffset}
                  setCarouselVerticalOffset={preferences.setCarouselVerticalOffset}
                  sidebarOpen={menuOpen}
                  crmMenuOpen={menuOpen}
                  handlePrevCard={handlePrevCard}
                  handleNextCard={handleNextCard}
                  handleCarouselAudioEnd={handleCarouselAudioEnd}
                  touchHandlers={touchHandlers}
                  handleWheel={handleWheel}
                  isAudioEnabled={isAudioEnabled}
                  handleAudioStart={handleAudioStart}
                />
              )}

              {preferences.viewMode === 'messages' && (
                <div className="w-full h-full pt-20 pb-24">
                  <RadioMessagesView
                    messages={messages}
                    isAutoAdvanceEnabled={preferences.isAutoAdvanceEnabled}
                    isAudioEnabled={isAudioEnabled}
                    currentPlayingId={currentPlayingId}
                    isAudioPlaying={isAudioPlaying}
                    onAudioStart={handleAudioStart}
                    onAudioEnd={handleAudioEnd}
                  />
                </div>
              )}

              {preferences.viewMode === 'tabs' && (
                <div className="w-full pt-20 pb-24 h-[calc(100vh-160px)]">
                  <MessageTabsView
                    messages={messages.map(m => ({
                      ...m,
                      conversation_id: m.conversation_id || currentConversationId || '',
                      is_visible_to_ai: m.is_visible_to_ai ?? true,
                    }))}
                    isAutoFollowEnabled={preferences.isAutoAdvanceEnabled}
                    onAutoFollowChange={preferences.setIsAutoAdvanceEnabled}
                    isAudioPlaying={isAudioPlaying}
                    onAudioStart={handleTabsAudioStart}
                    onAudioEnd={handleTabsAudioEnd}
                    conversationId={currentConversationId}
                  />
                </div>
              )}
            </div>
          </>
        }
        inputArea={
          <RadioInputArea
            inputVisible={ui.inputVisible}
            inputValue={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            isSending={isSending}
            onClose={() => ui.setInputVisible(false)}
          />
        }
        debugPanel={
          <RadioDebugPanel
            debugPopupOpen={ui.debugPopupOpen}
            setDebugPopupOpen={ui.setDebugPopupOpen}
            viewMode={preferences.viewMode}
            activeMessageId={activeMessageId}
            currentMessage={currentMessage}
            isSending={isSending}
            isAudioPlaying={isAudioPlaying}
            currentPlayingId={currentPlayingId}
            messages={messages}
            aiMessagesCount={aiMessages.length}
            participants={participants}
          />
        }
        bottomControls={
          <div className={cn(
            "fixed left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 transition-all duration-200",
            ui.inputVisible ? "bottom-[-4px]" : "bottom-[78px]"
          )}>
            {preferences.viewMode === 'carousel' && currentMessage?.audio_url && (
              <RadioCarouselAudioPlayerWrapper
                message={currentMessage}
                onAudioEnd={handleCarouselAudioEnd}
                isAudioEnabled={isAudioEnabled}
                className={ui.messageViewVisible ? 'opacity-0 pointer-events-none' : ''}
                sharedAudioRef={audioElementRef}
                isAudioPlaying={isAudioPlaying}
                onAudioStart={handleAudioStart}
              />
            )}
            {currentConversationId && ui.showAudioControls && (
              <RadioAudioControls
                conversationId={currentConversationId}
                onClose={() => ui.setShowAudioControls(false)}
                onSendMessage={sendMessage}
                participants={participants}
                cachedPrompts={cachedPrompts}
              />
            )}
          </div>
        }
        aiSidebar={null}
      />
    </RadioChatProvider>
  );
};

export default RadioChat;
