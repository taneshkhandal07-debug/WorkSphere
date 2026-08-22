'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Mic, 
  Square, 
  Trash2, 
  Edit2, 
  Smile, 
  MoreVertical, 
  Plus, 
  Users, 
  Search, 
  Folder, 
  FileText,
  Play,
  Volume2,
  X,
  UserPlus
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast, ToastProvider } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
  designation: string | null;
}

interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  members: Member[];
  lastMessage: {
    id: string;
    content: string | null;
    senderName: string;
    createdAt: string;
  } | null;
  updatedAt: string;
}

interface SharedFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

interface Message {
  id: string;
  content: string | null;
  senderId: string;
  sender: { id: string; firstName: string; lastName: string };
  isEdited: boolean;
  isDeleted: boolean;
  reactions: string | null; // JSON String
  createdAt: string;
  files: SharedFile[];
  replyTo: {
    id: string;
    content: string | null;
    sender: { firstName: string; lastName: string };
  } | null;
}

export default function MessagesPage() {
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Lists
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rosterUsers, setRosterUsers] = useState<any[]>([]);

  // Search/Filters
  const [convSearchTerm, setConvSearchTerm] = useState('');
  
  // Sidebar Detail state
  const [showDetails, setShowDetails] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);

  // Real-time WS & Polling states
  const socketRef = useRef<WebSocket | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Composer fields
  const [messageText, setMessageText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Voice note states
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordTimer, setRecordTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [isDMOpen, setIsDMOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  // Scroll anchor
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch initial profile and conversation directory
  const loadData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      const convsRes = await fetch('/api/conversations');
      if (convsRes.ok) {
        const convsData = await convsRes.json();
        setConversations(convsData.conversations);
      }

      const rosterRes = await fetch('/api/admin/users');
      if (rosterRes.ok) {
        const rosterData = await rosterRes.json();
        setRosterUsers(rosterData.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        
        // Extract shared files from messages
        const files: SharedFile[] = [];
        data.messages.forEach((msg: Message) => {
          if (msg.files && msg.files.length > 0) {
            files.push(...msg.files);
          }
        });
        setSharedFiles(files);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      setReplyToMessage(null);
      setEditingMessage(null);
      setAudioUrl(null);
      setMessageText('');
    }
  }, [activeConversation]);

  // WebSocket Connection
  useEffect(() => {
    // Connect to WebSocket Server
    const connectWS = () => {
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const defaultWsUrl = isLocalhost ? 'ws://localhost:3001' : '';
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;

      if (!wsUrl) {
        console.log('Real-Time WebSockets disabled (no NEXT_PUBLIC_WS_URL configured). Using fallback HTTP REST polling.');
        return;
      }

      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('Real-Time WebSocket Link Established.');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message' && activeConversation && data.conversationId === activeConversation.id) {
            fetchMessages(activeConversation.id);
          }

          if (data.type === 'typing' && activeConversation && data.conversationId === activeConversation.id) {
            if (data.userId !== currentUser?.id) {
              setTypingUser(data.username);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                setTypingUser(null);
              }, 2000);
            }
          }
        } catch (err) {
          console.error('WS Frame error:', err);
        }
      };

      ws.onclose = () => {
        console.log('WS Connection closed. Attempting reconnect in 5s...');
        setTimeout(connectWS, 5000);
      };
    };

    if (currentUser) {
      connectWS();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [currentUser, activeConversation]);

  // Fallback REST polling (every 3 seconds to ensure sync if WS is blocked)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeConversation) {
      interval = setInterval(() => {
        // Only fetch if socket is not currently connected
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
          fetchMessages(activeConversation.id);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // WS broadcast dispatcher helper
  const broadcastWS = (payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  };

  // Broadcast typing indicator
  const handleComposerTyping = () => {
    if (!activeConversation || !currentUser) return;
    broadcastWS({
      type: 'typing',
      conversationId: activeConversation.id,
      userId: currentUser.id,
      username: currentUser.firstName
    });
  };

  // Start Direct Message
  const handleStartDM = async (recipientId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGroup: false,
          userIds: [recipientId]
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Refresh conversations list
        const convsRes = await fetch('/api/conversations');
        if (convsRes.ok) {
          const convsData = await convsRes.json();
          setConversations(convsData.conversations);
          
          // Set active DM conversation
          const matchingConv = convsData.conversations.find((c: any) => c.id === data.conversation.id);
          if (matchingConv) {
            setActiveConversation(matchingConv);
          }
        }
        setIsDMOpen(false);
      } else {
        error('Chat error', data.error || 'Failed to start chat.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start Group Conversation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedGroupMembers.length === 0) {
      error('Input Error', 'Please specify a group name and add at least one member.');
      return;
    }

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGroup: true,
          name: groupName,
          userIds: selectedGroupMembers
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('Success', `Group channel "${groupName}" created.`);
        setGroupName('');
        setSelectedGroupMembers([]);
        setIsGroupOpen(false);
        
        // Reload list
        const convsRes = await fetch('/api/conversations');
        if (convsRes.ok) {
          const convsData = await convsRes.json();
          setConversations(convsData.conversations);
          
          const matchingConv = convsData.conversations.find((c: any) => c.id === data.conversation.id);
          if (matchingConv) {
            setActiveConversation(matchingConv);
          }
        }
      } else {
        error('Create Group Failed', data.error || 'Failed to create channel.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle group member checkbox
  const toggleGroupMemberSelection = (id: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation) return;

    // Handle Edit message
    if (editingMessage) {
      if (!messageText.trim()) return;
      try {
        const res = await fetch(`/api/messages/${editingMessage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: messageText })
        });
        if (res.ok) {
          setEditingMessage(null);
          setMessageText('');
          broadcastWS({ type: 'message', conversationId: activeConversation.id });
          fetchMessages(activeConversation.id);
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (!messageText.trim()) return;

    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageText,
          replyToId: replyToMessage?.id || null
        })
      });

      if (res.ok) {
        setMessageText('');
        setReplyToMessage(null);
        // Dispatch instant WebSocket message frame
        broadcastWS({
          type: 'message',
          conversationId: activeConversation.id
        });
        fetchMessages(activeConversation.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message (soft-delete)
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeConversation) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        broadcastWS({ type: 'message', conversationId: activeConversation.id });
        fetchMessages(activeConversation.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Emoji reaction toggle
  const handleEmojiReaction = async (msg: Message, emoji: string) => {
    if (!activeConversation || !currentUser) return;
    
    // Parse reactions JSON
    let reactionsMap: Record<string, string[]> = {};
    if (msg.reactions) {
      try {
        reactionsMap = JSON.parse(msg.reactions);
      } catch (err) {
        console.error(err);
      }
    }

    const reactors = reactionsMap[emoji] || [];
    if (reactors.includes(currentUser.id)) {
      // Remove reaction
      reactionsMap[emoji] = reactors.filter((id) => id !== currentUser.id);
      if (reactionsMap[emoji].length === 0) delete reactionsMap[emoji];
    } else {
      // Add reaction
      reactionsMap[emoji] = [...reactors, currentUser.id];
    }

    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactions: reactionsMap })
      });
      if (res.ok) {
        broadcastWS({ type: 'message', conversationId: activeConversation.id });
        fetchMessages(activeConversation.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Attachment upload trigger
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeConversation || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // File validation limits (10MB)
    if (file.size > 10 * 1024 * 1024) {
      error('Size Limit', 'File size exceeds maximum 10MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', activeConversation.id);

    info('Uploading file...', 'Transmitting attachment file.');
    try {
      // 1. Upload to local uploads path
      const uploadRes = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (uploadRes.ok) {
        const fileId = uploadData.file.id;

        // 2. Post file to messages
        const msgRes = await fetch(`/api/conversations/${activeConversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Shared file: ${file.name}`,
            fileId
          })
        });

        if (msgRes.ok) {
          success('Success', 'File shared in conversation.');
          broadcastWS({ type: 'message', conversationId: activeConversation.id });
          fetchMessages(activeConversation.id);
        }
      } else {
        error('Upload failed', uploadData.error || 'Failed to save file.');
      }
    } catch (err) {
      console.error(err);
      error('Upload error', 'Failed to communicate with upload server.');
    }
  };

  // Voice Note Recording functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };
      
      recorder.start();
      setRecording(true);
      setAudioUrl(null);
      setRecordTimer(0);
      
      // Duration ticking timer
      timerRef.current = setInterval(() => {
        setRecordTimer((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      error('Access Error', 'Microphone permissions denied.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSendVoiceNote = async () => {
    if (!audioUrl || !activeConversation) return;

    try {
      const resBlob = await fetch(audioUrl);
      const audioBlob = await resBlob.blob();

      const formData = new FormData();
      formData.append('file', audioBlob, `voice-note-${Date.now()}.webm`);
      formData.append('conversationId', activeConversation.id);

      info('Sending voice note...', 'Uploading audio wave file.');
      const uploadRes = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (uploadRes.ok) {
        const fileId = uploadData.file.id;

        const msgRes = await fetch(`/api/conversations/${activeConversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Voice note (Audio)',
            fileId
          })
        });

        if (msgRes.ok) {
          setAudioUrl(null);
          broadcastWS({ type: 'message', conversationId: activeConversation.id });
          fetchMessages(activeConversation.id);
          success('Voice note transmitted.');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Filters Conversations matching search
  const filteredConversations = conversations.filter((c) => {
    if (!c.isGroup) {
      const otherMember = c.members.find((m) => m.name !== `${currentUser?.firstName} ${currentUser?.lastName}`);
      return otherMember?.name.toLowerCase().includes(convSearchTerm.toLowerCase());
    }
    return c.name?.toLowerCase().includes(convSearchTerm.toLowerCase());
  });

  const getConversationTitle = (conv: Conversation) => {
    if (conv.isGroup) return conv.name || 'Group Chat';
    const otherMember = conv.members.find((m) => m.userId !== currentUser?.id);
    return otherMember ? otherMember.name : 'Direct Message';
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: showDetails ? '260px 1fr 240px' : '260px 1fr',
      height: 'calc(100vh - 120px)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)'
    }}>
      
      {/* 1. LEFT PANE: CONVERSATION LIST */}
      <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)' }}>
        {/* Search & Actions */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Chats</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button size="sm" variant="outline" onClick={() => setIsDMOpen(true)} title="New direct message" style={{ padding: '6px' }}>
                <MessageSquare size={13} />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsGroupOpen(true)} title="Create group channel" style={{ padding: '6px' }}>
                <Plus size={13} />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="header-search-icon" size={13} style={{ left: '10px' }} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="header-search-input"
              style={{ paddingLeft: '32px', fontSize: '12px', height: '30px' }}
              value={convSearchTerm}
              onChange={(e) => setConvSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '20px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No chats active. Click buttons above to start.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const active = activeConversation?.id === conv.id;
              const title = getConversationTitle(conv);
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: active ? 'var(--bg-tertiary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'background-color 0.2s'
                  }}
                  className="hover:bg-tertiary"
                >
                  <Avatar name={title} size="sm" />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {title}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {conv.lastMessage 
                        ? `${conv.lastMessage.senderName}: ${conv.lastMessage.content || 'Attachment file'}` 
                        : 'No messages yet.'
                      }
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. MIDDLE PANE: ACTIVE CHAT CONTAINER */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {activeConversation ? (
          <>
            {/* Active Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {getConversationTitle(activeConversation)}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {activeConversation.isGroup 
                    ? `${activeConversation.members.length} members` 
                    : activeConversation.members.find(m => m.userId !== currentUser?.id)?.designation || 'Specialist'
                  }
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowDetails(!showDetails)}>
                <span>{showDetails ? 'Hide details' : 'Show details'}</span>
              </Button>
            </div>

            {/* Messages Scroll Box */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-primary)' }}>
              {messages.map((msg) => {
                const isMyMessage = msg.senderId === currentUser?.id;
                const senderName = `${msg.sender.firstName} ${msg.sender.lastName}`;
                
                // Parse reactions mapping
                let reactionsMap: Record<string, string[]> = {};
                if (msg.reactions) {
                  try { reactionsMap = JSON.parse(msg.reactions); } catch(e){}
                }

                return (
                  <div 
                    key={msg.id} 
                    style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      flexDirection: isMyMessage ? 'row-reverse' : 'row'
                    }}
                  >
                    <Avatar name={senderName} size="sm" />
                    
                    <div>
                      {/* Sender details and Date */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontWeight: 600 }}>{senderName}</span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.isEdited && <span>(edited)</span>}
                      </div>

                      {/* Reply preview if exists */}
                      {msg.replyTo && (
                        <div style={{ 
                          fontSize: '11px', 
                          borderLeft: '2px solid var(--accent-color)', 
                          paddingLeft: '6px', 
                          marginBottom: '4px',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic'
                        }}>
                          Replying to {msg.replyTo.sender.firstName}: {msg.replyTo.content || 'attachment'}
                        </div>
                      )}

                      {/* Body Message box */}
                      <div style={{ 
                        padding: '10px 14px', 
                        borderRadius: 'var(--radius-sm)', 
                        fontSize: '12.5px',
                        backgroundColor: isMyMessage ? 'var(--accent-color)' : 'var(--bg-secondary)',
                        color: isMyMessage ? '#ffffff' : 'var(--text-primary)',
                        border: isMyMessage ? 'none' : '1px solid var(--border-color)',
                        lineHeight: 1.4,
                        position: 'relative'
                      }}>
                        {msg.isDeleted ? (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>This message was deleted.</span>
                        ) : (
                          <>
                            {msg.content}
                            
                            {/* File Attachment previews */}
                            {msg.files && msg.files.map(file => (
                              <div key={file.id} style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                {file.mimeType.startsWith('image/') ? (
                                  <img src={file.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: 'var(--radius-sm)' }} />
                                ) : file.mimeType.startsWith('audio/') ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                    <Volume2 size={16} />
                                    <audio src={file.url} controls style={{ height: '24px', maxWidth: '180px' }} />
                                  </div>
                                ) : (
                                  <a href={file.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isMyMessage ? '#fff' : 'var(--accent-color)', fontWeight: 600, textDecoration: 'underline' }}>
                                    <FileText size={14} />
                                    <span style={{ fontSize: '11px' }}>{file.name}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </>
                        )}
                      </div>

                      {/* Reactions & Actions Row */}
                      {!msg.isDeleted && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }}>
                          {/* Emoji reaction triggers */}
                          {['👍', '❤️', '🔥'].map(emoji => {
                            const count = reactionsMap[emoji]?.length || 0;
                            const didReact = reactionsMap[emoji]?.includes(currentUser?.id || '');
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleEmojiReaction(msg, emoji)}
                                style={{
                                  padding: '2px 5px',
                                  fontSize: '10px',
                                  borderRadius: '3px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: didReact ? 'var(--accent-light)' : 'var(--bg-secondary)',
                                  cursor: 'pointer',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                {emoji} {count > 0 && count}
                              </button>
                            );
                          })}

                          {/* Quick replies & edits actions */}
                          <button onClick={() => setReplyToMessage(msg)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }} className="hover:text-primary">
                            Reply
                          </button>

                          {isMyMessage && (
                            <>
                              <button onClick={() => { setEditingMessage(msg); setMessageText(msg.content || ''); }} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }} className="hover:text-primary">
                                Edit
                              </button>
                              <button onClick={() => handleDeleteMessage(msg.id)} style={{ border: 'none', background: 'none', color: 'var(--error-color)', fontSize: '10px', cursor: 'pointer' }} className="hover:text-primary">
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
              
              {/* Dynamic typing indicators */}
              {typingUser && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '48px' }}>
                  <LoadingSpinner size={10} />
                  <span>{typingUser} is typing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Composer Footer input */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-secondary)' }}>
              
              {/* Reply Preview indicator */}
              {replyToMessage && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', backgroundColor: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '4px', borderLeft: '3px solid var(--accent-color)' }}>
                  <span>Replying to {replyToMessage.sender.firstName}: "{replyToMessage.content}"</span>
                  <button onClick={() => setReplyToMessage(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Edit Preview indicator */}
              {editingMessage && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', backgroundColor: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '4px', borderLeft: '3px solid var(--warning-color)' }}>
                  <span>Editing message content...</span>
                  <button onClick={() => { setEditingMessage(null); setMessageText(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Voice recording preview status */}
              {audioUrl && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <Volume2 size={16} color="var(--accent-color)" />
                    <span>Voice recording ready</span>
                    <audio src={audioUrl} controls style={{ height: '24px', maxWidth: '240px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button variant="outline" size="sm" onClick={() => setAudioUrl(null)} style={{ height: '30px', padding: '0 8px' }}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSendVoiceNote} style={{ height: '30px', padding: '0 8px' }}>
                      Send Audio
                    </Button>
                  </div>
                </div>
              )}

              {/* Composer input box */}
              {!audioUrl && (
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  
                  {/* File Upload Hidden Picker */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleAttachmentUpload}
                  />
                  
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '6px', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
                    title="Upload file attachment"
                  >
                    <Paperclip size={18} />
                  </button>

                  {/* Typing input */}
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => { setMessageText(e.target.value); handleComposerTyping(); }}
                    placeholder="Type message here..."
                    className="input-field"
                    style={{ margin: 0, fontSize: '13px' }}
                  />

                  {/* Mic / Voice Note recording button */}
                  {recording ? (
                    <button 
                      type="button" 
                      onClick={stopVoiceRecording}
                      style={{ padding: '6px', color: 'var(--error-color)', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Square size={16} fill="currentColor" />
                      <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{formatTimer(recordTimer)}</span>
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startVoiceRecording}
                      style={{ padding: '6px', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
                      title="Record voice note"
                    >
                      <Mic size={18} />
                    </button>
                  )}

                  <Button type="submit" variant="primary" style={{ padding: '8px 12px', height: '36px' }}>
                    <Send size={14} />
                  </Button>
                </form>
              )}

            </div>
          </>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Start Collaborating"
            description="Select a group channel or direct message from the sidebar panel to check message streams."
          />
        )}
      </div>

      {/* 3. RIGHT PANE: CONVERSATION DETAILS (Collapsible) */}
      {showDetails && activeConversation && (
        <div style={{ borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', overflowY: 'auto' }}>
          
          {/* Members list */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Users size={14} />
              <span>Workspace Members</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeConversation.members.map(m => (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar name={m.name} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{m.designation || 'Staff'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Files list */}
          <div style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Folder size={14} />
              <span>Shared Drive Files</span>
            </h4>
            {sharedFiles.length === 0 ? (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No shared attachments.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sharedFiles.map(file => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      textDecoration: 'none',
                      color: 'var(--text-secondary)'
                    }}
                    className="hover:shadow-sm"
                  >
                    <FileText size={14} color="var(--accent-color)" />
                    <div style={{ minWidth: 0, flexGrow: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{file.name}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* START DIRECT MESSAGE MODAL */}
      <Modal
        isOpen={isDMOpen}
        onClose={() => setIsDMOpen(false)}
        title="Start Direct Message"
        footer={<Button variant="outline" size="sm" onClick={() => setIsDMOpen(false)}>Cancel</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
          {rosterUsers
            .filter((u) => u.id !== currentUser?.id && u.status === 'ACTIVE')
            .map((u) => {
              const name = `${u.firstName} ${u.lastName}`;
              return (
                <div
                  key={u.id}
                  onClick={() => handleStartDM(u.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                  className="hover:bg-tertiary"
                >
                  <Avatar name={name} size="sm" />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.designation || 'Staff'}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </Modal>

      {/* CREATE GROUP MODAL */}
      <Modal
        isOpen={isGroupOpen}
        onClose={() => setIsGroupOpen(false)}
        title="Create Group Channel"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsGroupOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreateGroup}>Create Group</Button>
          </div>
        }
      >
        <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Sprint Review Q3"
            required
          />

          <div className="form-group">
            <label className="input-label" style={{ marginBottom: '6px' }}>Select Group Members</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              {rosterUsers
                .filter((u) => u.id !== currentUser?.id && u.status === 'ACTIVE')
                .map((u) => {
                  const name = `${u.firstName} ${u.lastName}`;
                  return (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedGroupMembers.includes(u.id)}
                        onChange={() => toggleGroupMemberSelection(u.id)}
                      />
                      <span>{name} ({u.designation || 'Staff'})</span>
                    </label>
                  );
                })}
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
}
