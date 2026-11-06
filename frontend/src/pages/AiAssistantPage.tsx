import {useEffect,useRef,type ReactNode} from 'react';
import {AlertCircle,Atom,Bot,Cpu,Database,Loader2,MessageSquare,RefreshCcw,Send,ShieldCheck,Sparkles,User} from 'lucide-react';
import {Badge,Button} from '../components/ui';
import {isReducedMotionActive} from '../components/motion/usePointerMotion';
import {useAi} from '../contexts/AiContext';

import {EXAMPLE_PROMPTS} from '../constants/aiPrompts';
export {EXAMPLE_PROMPTS};

const PROMPT_META:Record<string,{category:string;icon:ReactNode}>={
  'What is EntangleX Q-Health?':{category:'Platform Overview',icon:<Sparkles size={14} className="text-primary"/>},
  'How does the hybrid quantum-classical model work?':{category:'Hybrid Architecture',icon:<Cpu size={14} className="text-primary"/>},
  'Explain the VQC workflow.':{category:'Quantum Circuit',icon:<Atom size={14} className="text-primary"/>},
  'What is the role of PCA in this prototype?':{category:'Dimensionality & Encoding',icon:<Database size={14} className="text-primary"/>},
};

function renderInlineFormatting(text:string):ReactNode[]{
  const parts=text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part,idx)=>{
    if(part.startsWith('**')&&part.endsWith('**')&&part.length>4){
      return <strong key={idx} className="font-semibold text-foreground">{part.slice(2,-2)}</strong>;
    }
    if(part.startsWith('`')&&part.endsWith('`')&&part.length>2){
      return <code key={idx} className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-foreground">{part.slice(1,-1)}</code>;
    }
    return part;
  });
}

function renderAssistantText(text:string){
  const lines=text.split('\n');
  const elements:ReactNode[]=[];
  let inCodeBlock=false;
  let codeLines:string[]=[];

  lines.forEach((line,index)=>{
    const trimmed=line.trim();
    if(trimmed.startsWith('```')){
      if(inCodeBlock){
        elements.push(
          <pre key={`code-${index}`} className="my-2.5 p-3 rounded-lg bg-muted/80 border border-border overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines=[];
        inCodeBlock=false;
      }else{
        inCodeBlock=true;
      }
      return;
    }
    if(inCodeBlock){
      codeLines.push(line);
      return;
    }
    if(!trimmed){
      elements.push(<div key={index} className="h-2"/>);
      return;
    }
    if(trimmed.startsWith('### ')||trimmed.startsWith('## ')){
      const headingText=trimmed.replace(/^#{2,3}\s+/,'');
      elements.push(
        <h4 key={index} className="text-sm font-semibold text-foreground mt-3 mb-1">
          {renderInlineFormatting(headingText)}
        </h4>
      );
      return;
    }
    if(trimmed.startsWith('- ')||trimmed.startsWith('* ')){
      elements.push(
        <div key={index} className="flex gap-2.5 text-sm leading-relaxed my-1 pl-1">
          <span className="text-primary font-bold select-none">•</span>
          <span>{renderInlineFormatting(trimmed.slice(2))}</span>
        </div>
      );
      return;
    }
    const numberedMatch=trimmed.match(/^(\d+)\.\s+(.*)$/);
    if(numberedMatch){
      elements.push(
        <div key={index} className="flex gap-2.5 text-sm leading-relaxed my-1 pl-1">
          <span className="text-primary font-mono text-xs font-semibold mt-0.5 select-none">{numberedMatch[1]}.</span>
          <span>{renderInlineFormatting(numberedMatch[2])}</span>
        </div>
      );
      return;
    }
    elements.push(
      <p key={index} className="text-sm leading-relaxed mb-1.5">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  if(inCodeBlock&&codeLines.length){
    elements.push(
      <pre key="code-unclosed" className="my-2.5 p-3 rounded-lg bg-muted/80 border border-border overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  }

  return elements;
}

export function AiAssistantPage(){
  const {messages,input,loading,error,setInput,handleSend,clearChat}=useAi();
  const endRef=useRef<HTMLDivElement>(null);
  const textareaRef=useRef<HTMLTextAreaElement>(null);

  useEffect(()=>{
    if(messages.length){
      endRef.current?.scrollIntoView({behavior:isReducedMotionActive()?'auto':'smooth'});
    }
  },[messages,loading]);

  const onKeyDown=(event:React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if(event.key==='Enter'&&!event.shiftKey){
      event.preventDefault();
      void handleSend(input);
    }
  };

  const onInput=(event:React.ChangeEvent<HTMLTextAreaElement>)=>{
    setInput(event.target.value);
    event.target.style.height='auto';
    event.target.style.height=`${Math.min(event.target.scrollHeight,200)}px`;
  };

  return <div className="layer3-final-workspace layer3-ai-workspace flex flex-col min-h-[calc(100dvh-7.5rem)] max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-4 border-b border-border">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge tone="blue"><Sparkles size={12}/> Research Copilot</Badge>
          <Badge tone="purple"><ShieldCheck size={12}/> Non-Clinical Boundary</Badge>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
          <Bot className="text-primary w-7 h-7"/>EntangleX AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your prototype-aware research assistant for hybrid quantum–classical workflows, methodology, and evidence interpretation.
        </p>
      </div>
      {messages.length>0&&<Button variant="outline" onClick={()=>{if(window.confirm('Clear current conversation?'))clearChat();}} className="flex items-center gap-2 py-1.5 px-3">
        <RefreshCcw size={16}/><span className="hidden sm:inline">New conversation</span>
      </Button>}
    </div>

    <div className="flex-1 overflow-y-auto mb-4 space-y-6 pr-1 sm:pr-2 scrollbar-thin">
      {!messages.length?<div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center space-y-6">
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl shadow-sm">
          <MessageSquare className="w-10 h-10 text-primary"/>
        </div>
        <div className="max-w-xl w-full">
          <h2 className="text-xl font-semibold mb-2 text-foreground">How can I help you?</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ask about the EntangleX Q-Health architecture, quantum workflow, models, evidence, and how to use the platform.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {EXAMPLE_PROMPTS.map(prompt=>{
              const meta=PROMPT_META[prompt];
              return (
                <button
                  key={prompt}
                  type="button"
                  onClick={()=>void handleSend(prompt)}
                  className="group flex flex-col justify-between gap-2 text-left text-sm bg-card border border-border hover:border-primary hover:bg-accent/40 text-foreground transition-all p-3.5 rounded-xl shadow-sm"
                >
                  <span className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground group-hover:text-primary">
                    {meta?.icon}
                    {meta?.category||'Research Query'}
                  </span>
                  <span className="font-medium leading-snug">{prompt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>:<div className="space-y-5 pb-4" role="log" aria-live="polite">
        {messages.map((message,index)=><div key={index} className={`flex gap-3 sm:gap-4 ${message.role==='user'?'justify-end':'justify-start'}`}>
          {message.role==='model'&&<div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5"><Bot size={17} className="text-primary"/></div>}
          <div className={`max-w-[88%] md:max-w-[78%] rounded-2xl px-4 sm:px-5 py-3.5 shadow-sm ${message.role==='user'?'bg-primary text-primary-foreground rounded-tr-sm':'bg-card border border-border text-card-foreground rounded-tl-sm'}`}>
            <div className="flex items-center justify-between gap-3 mb-1 opacity-75 text-[11px] font-mono uppercase tracking-wider">
              <span>{message.role==='user'?'Researcher':'EntangleX Copilot'}</span>
            </div>
            {message.role==='user'?<div className="whitespace-pre-wrap text-sm md:text-base">{message.content}</div>:renderAssistantText(message.content)}
          </div>
          {message.role==='user'&&<div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5"><User size={17} className="text-secondary-foreground"/></div>}
        </div>)}
        {loading&&<div className="flex gap-3 sm:gap-4 justify-start"><div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0"><Bot size={17} className="text-primary"/></div><div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2.5 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin text-primary"/><span className="text-sm">Synthesizing research response...</span></div></div>}
        <div ref={endRef}/>
      </div>}
    </div>

    {error&&<div className="flex gap-4 justify-center mb-4" role="alert"><div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm flex items-center gap-2.5 max-w-lg w-full"><AlertCircle size={18} className="shrink-0"/><p>{error}</p></div></div>}

    <div className="bg-card border border-border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all p-2.5 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={onInput}
        onKeyDown={onKeyDown}
        aria-label="Ask EntangleX AI Assistant"
        placeholder="Ask about EntangleX Q-Health, VQC circuits, PCA encoding, or controlled evaluation..."
        className="flex-1 max-h-48 min-h-[44px] bg-transparent resize-none border-0 focus:ring-0 p-2 text-foreground text-sm md:text-base scrollbar-thin outline-none"
        disabled={loading}
        rows={1}
        maxLength={2000}
      />
      <Button
        type="button"
        onClick={()=>void handleSend(input)}
        disabled={!input.trim()||loading}
        aria-label="Send message"
        className="shrink-0 h-10 w-10 flex items-center justify-center p-0 rounded-lg mb-0.5"
      >
        <Send size={18}/>
      </Button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mt-2 px-1">
      <span>The AI Assistant may produce inaccurate information. Always verify scientific facts against persisted experiment artifacts.</span>
      <span className="font-mono">{input.length}/2000</span>
    </div>
  </div>;
}
