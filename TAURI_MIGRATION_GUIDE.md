# Tauri 2.0 Migration Implementation Guide

**Companion Document to:** AVALONIA_DEPRECATION_ANALYSIS.md  
**Version:** 1.0  
**Date:** October 23, 2025  
**Target Timeline:** 6 weeks

---

## Quick Start

This guide provides hands-on implementation steps for migrating MyPal from Avalonia to Tauri 2.0 with React.

### Prerequisites

```bash
# Required Software
- Node.js 18+ (LTS)
- Rust 1.70+ (install via rustup.rs)
- Git
- VS Code (recommended)

# Platform-Specific
Windows: Visual Studio Build Tools 2022, WebView2
macOS:   Xcode Command Line Tools
Linux:   webkit2gtk-4.1-dev, build-essential
```

---

## Week 1: Project Setup & Prototype

### Day 1: Tauri Installation

**1. Install Rust and Tauri CLI:**
```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli --version "^2.0"

# Verify installation
cargo tauri --version
```

**2. Create Tauri Project Structure:**
```bash
cd /path/to/MyPal

# Initialize Tauri (creates src-tauri directory)
npm install @tauri-apps/api@next
npm install -D @tauri-apps/cli@next
npm exec tauri init

# Answer prompts:
# App name: MyPal
# Window title: MyPal - AI Companion
# Web assets: ../app/frontend
# Dev server URL: http://localhost:5173
# Dev command: npm run dev
# Build command: npm run build
```

**3. Create React Frontend:**
```bash
# Create new React + TypeScript + Vite project
npm create vite@latest app/frontend-react -- --template react-ts
cd app/frontend-react
npm install

# Install core dependencies
npm install @tauri-apps/api axios zustand
npm install three @react-three/fiber @react-three/drei
npm install 3d-force-graph
npm install chart.js react-chartjs-2
npm install framer-motion
npm install date-fns clsx
```

### Day 2: Configure Tauri

**Edit:** `src-tauri/tauri.conf.json`
```json
{
  "$schema": "https://schema.tauri.app/config/2.0",
  "productName": "MyPal",
  "version": "0.3.0",
  "identifier": "com.mypal.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../app/frontend-react/dist"
  },
  "app": {
    "windows": [
      {
        "title": "MyPal - AI Companion",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "theme": "Dark"
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
    },
    "systemTray": {
      "iconPath": "icons/icon.png"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis", "deb", "appimage", "dmg"],
    "identifier": "com.mypal.app",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**Edit:** `src-tauri/Cargo.toml`
```toml
[package]
name = "mypal"
version = "0.3.0"
description = "MyPal AI Companion"
authors = ["MyPal Team"]
edition = "2021"

[dependencies]
tauri = { version = "2.0", features = ["devtools"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

### Day 3: Backend Integration

**Create:** `src-tauri/src/backend.rs`
```rust
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::State;

pub struct BackendState {
    process: Mutex<Option<Child>>,
}

impl BackendState {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn start_backend(state: State<'_, BackendState>) -> Result<String, String> {
    let mut process_lock = state.process.lock().unwrap();
    
    if process_lock.is_some() {
        return Ok("Backend already running".into());
    }
    
    // Get path to Node.js backend
    let backend_path = if cfg!(debug_assertions) {
        "../app/backend/src/server.js"
    } else {
        // In production, backend is bundled in resources
        "./resources/backend/src/server.js"
    };
    
    // Start Node.js backend
    let child = Command::new("node")
        .arg(backend_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start backend: {}", e))?;
    
    *process_lock = Some(child);
    
    Ok("Backend started successfully".into())
}

#[tauri::command]
pub async fn stop_backend(state: State<'_, BackendState>) -> Result<String, String> {
    let mut process_lock = state.process.lock().unwrap();
    
    if let Some(mut child) = process_lock.take() {
        child.kill().map_err(|e| format!("Failed to stop backend: {}", e))?;
        Ok("Backend stopped".into())
    } else {
        Ok("Backend not running".into())
    }
}

#[tauri::command]
pub async fn check_backend_health() -> Result<bool, String> {
    // Try to connect to backend health endpoint
    let client = reqwest::Client::new();
    match client.get("http://localhost:3001/api/health").send().await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}
```

**Update:** `src-tauri/src/main.rs`
```rust
// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;

use backend::{BackendState, start_backend, stop_backend, check_backend_health};

fn main() {
    tauri::Builder::default()
        .manage(BackendState::new())
        .setup(|app| {
            // Auto-start backend on app launch
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                // Wait a moment for app to initialize
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                
                // Start backend
                let state = app_handle.state::<BackendState>();
                if let Err(e) = start_backend(state).await {
                    eprintln!("Failed to start backend: {}", e);
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            check_backend_health,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Stop backend when window closes
                let state = window.state::<BackendState>();
                tauri::async_runtime::block_on(async {
                    let _ = stop_backend(state).await;
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Add reqwest dependency to Cargo.toml:**
```toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
```

### Day 4-5: Frontend Foundation

**Create:** `app/frontend-react/src/services/api.ts`
```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Backend health check
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch {
    return false;
  }
}

// Profile APIs
export async function getProfiles() {
  const response = await api.get('/profiles');
  return response.data;
}

export async function createProfile(name: string) {
  const response = await api.post('/profiles', { name });
  return response.data;
}

export async function selectProfile(profileId: string) {
  const response = await api.post(`/profiles/${profileId}/select`);
  return response.data;
}

// Chat APIs
export async function sendMessage(message: string) {
  const response = await api.post('/chat', { message });
  return response.data;
}

export async function getChatHistory(limit: number = 200) {
  const response = await api.get(`/chat?limit=${limit}`);
  return response.data;
}

// Stats APIs
export async function getStats() {
  const response = await api.get('/stats');
  return response.data;
}

// Brain APIs
export async function getKnowledgeGraph() {
  const response = await api.get('/brain/knowledge-graph');
  return response.data;
}

export async function getNeuralNetwork() {
  const response = await api.get('/brain/neural-network');
  return response.data;
}
```

**Create:** `app/frontend-react/src/services/tauri.ts`
```typescript
import { invoke } from '@tauri-apps/api/core';
import { checkBackendHealth } from './api';

export async function initializeBackend(): Promise<void> {
  console.log('Starting backend...');
  
  try {
    await invoke('start_backend');
    
    // Wait for backend to be ready (max 30 seconds)
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const healthy = await checkBackendHealth();
      if (healthy) {
        console.log('Backend is ready!');
        return;
      }
    }
    
    throw new Error('Backend failed to start within 30 seconds');
  } catch (error) {
    console.error('Failed to start backend:', error);
    throw error;
  }
}

export async function shutdownBackend(): Promise<void> {
  try {
    await invoke('stop_backend');
    console.log('Backend stopped');
  } catch (error) {
    console.error('Failed to stop backend:', error);
  }
}
```

**Create:** `app/frontend-react/src/stores/profileStore.ts`
```typescript
import { create } from 'zustand';

interface Profile {
  id: string;
  name: string;
  level: number;
  xp: number;
  lastPlayed: number;
  messageCount: number;
}

interface ProfileState {
  profiles: Profile[];
  selectedProfile: Profile | null;
  isLoading: boolean;
  error: string | null;
  
  setProfiles: (profiles: Profile[]) => void;
  selectProfile: (profile: Profile) => void;
  clearSelectedProfile: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  selectedProfile: null,
  isLoading: false,
  error: null,
  
  setProfiles: (profiles) => set({ profiles }),
  selectProfile: (profile) => set({ selectedProfile: profile }),
  clearSelectedProfile: () => set({ selectedProfile: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
```

**Create:** `app/frontend-react/src/stores/chatStore.ts`
```typescript
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  setMessages: (messages) => set({ messages }),
  setTyping: (typing) => set({ isTyping: typing }),
  clearMessages: () => set({ messages: [] }),
}));
```

---

## Week 2-3: Core UI Implementation

### Profile Selection Component

**Create:** `app/frontend-react/src/components/ProfileSelection.tsx`
```typescript
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProfileStore } from '../stores/profileStore';
import { getProfiles, createProfile, selectProfile } from '../services/api';
import './ProfileSelection.css';

export function ProfileSelection({ onProfileSelected }: { onProfileSelected: () => void }) {
  const { profiles, isLoading, error, setProfiles, selectProfile: selectProfileStore, setLoading, setError } = useProfileStore();
  
  useEffect(() => {
    loadProfiles();
  }, []);
  
  async function loadProfiles() {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfiles();
      setProfiles(data.profiles);
    } catch (err) {
      setError('Failed to load profiles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleCreateProfile() {
    const name = prompt('Enter profile name:');
    if (!name) return;
    
    try {
      const newProfile = await createProfile(name);
      await loadProfiles(); // Reload profiles
    } catch (err) {
      alert('Failed to create profile');
      console.error(err);
    }
  }
  
  async function handleSelectProfile(profile: any) {
    try {
      await selectProfile(profile.id);
      selectProfileStore(profile);
      onProfileSelected();
    } catch (err) {
      alert('Failed to select profile');
      console.error(err);
    }
  }
  
  if (isLoading) {
    return (
      <div className="profile-selection loading">
        <div className="spinner"></div>
        <p>Loading profiles...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="profile-selection error">
        <p>{error}</p>
        <button onClick={loadProfiles}>Retry</button>
      </div>
    );
  }
  
  return (
    <div className="profile-selection">
      <h1>Select Your Pal</h1>
      
      <div className="profile-grid">
        {profiles.map((profile, index) => (
          <motion.div
            key={profile.id}
            className="profile-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => handleSelectProfile(profile)}
          >
            <div className="profile-avatar">
              <span className="profile-initial">{profile.name[0]}</span>
            </div>
            <h3>{profile.name}</h3>
            <div className="profile-stats">
              <span>Level {profile.level}</span>
              <span>{profile.messageCount} messages</span>
            </div>
            <div className="profile-xp-bar">
              <div 
                className="profile-xp-fill" 
                style={{ width: `${(profile.xp % 100)}%` }}
              />
            </div>
          </motion.div>
        ))}
        
        <motion.div
          className="profile-card create-new"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: profiles.length * 0.1 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleCreateProfile}
        >
          <div className="plus-icon">+</div>
          <h3>Create New Profile</h3>
        </motion.div>
      </div>
    </div>
  );
}
```

**Create:** `app/frontend-react/src/components/ProfileSelection.css`
```css
/* Cyberpunk Design System */
:root {
  --navy-deep: #0a0e27;
  --navy-dark: #12162e;
  --navy-medium: #1a1f3a;
  --purple-primary: #7b68ee;
  --purple-light: #a78bfa;
  --cyan-primary: #00d4ff;
  --cyan-light: #3dd9eb;
  --pink-accent: #ff006e;
  --glass-bg: rgba(30, 33, 57, 0.4);
  --glass-border: #2e3451;
}

.profile-selection {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-dark) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.profile-selection h1 {
  font-family: 'Inter', sans-serif;
  font-weight: 200;
  font-size: 3rem;
  color: #ffffff;
  margin-bottom: 3rem;
  text-align: center;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  max-width: 1400px;
  width: 100%;
}

.profile-card {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.profile-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--purple-primary) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.profile-card:hover::before {
  opacity: 0.1;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--purple-primary), var(--cyan-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.profile-initial {
  font-size: 2rem;
  font-weight: 300;
  color: white;
}

.profile-card h3 {
  font-family: 'Inter', sans-serif;
  font-weight: 300;
  font-size: 1.5rem;
  color: #ffffff;
  text-align: center;
  margin-bottom: 1rem;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1rem;
  color: #8b92c1;
  font-size: 0.9rem;
}

.profile-xp-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.profile-xp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--purple-primary), var(--cyan-primary));
  transition: width 0.3s ease;
}

.profile-card.create-new {
  background: linear-gradient(135deg, rgba(123, 104, 238, 0.1), rgba(0, 212, 255, 0.1));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.plus-icon {
  font-size: 4rem;
  color: var(--purple-light);
  font-weight: 100;
  margin-bottom: 1rem;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.spinner {
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid var(--purple-primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Chat Interface Components

**Create:** `app/frontend-react/src/components/ChatView.tsx`
```typescript
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../stores/chatStore';
import { getChatHistory, sendMessage } from '../services/api';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import './ChatView.css';

export function ChatView() {
  const { messages, isTyping, setMessages, addMessage, setTyping } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadChatHistory();
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  async function loadChatHistory() {
    try {
      const data = await getChatHistory(200);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }
  
  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
  
  async function handleSendMessage(text: string) {
    // Add user message immediately
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      text,
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    
    // Show typing indicator
    setTyping(true);
    
    try {
      // Send to backend
      const response = await sendMessage(text);
      
      // Add assistant response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        text: response.reply,
        timestamp: Date.now(),
      };
      addMessage(assistantMessage);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Add error message
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      });
    } finally {
      setTyping(false);
    }
  }
  
  return (
    <div className="chat-view">
      <div className="chat-messages">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>
        
        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput onSend={handleSendMessage} disabled={isTyping} />
    </div>
  );
}
```

**Create:** `app/frontend-react/src/components/MessageBubble.tsx`
```typescript
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import './MessageBubble.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      className={`message-bubble ${isUser ? 'user' : 'assistant'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="message-content">
        {message.text}
      </div>
      <div className="message-timestamp">
        {formatDistanceToNow(message.timestamp, { addSuffix: true })}
      </div>
    </motion.div>
  );
}
```

Due to character limits, I'll create more focused implementation files. Let me continue:

<function_calls>
<invoke name="str_replace">
<parameter name="path">/home/runner/work/MyPal/MyPal/TAURI_MIGRATION_GUIDE.md