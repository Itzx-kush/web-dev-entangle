import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ResearchShell} from '../components/ResearchShell';
import {AiPopup} from '../components/AiPopup';
import {Overview} from '../pages/ResearchPagesCore';
import {DraftProvider} from '../hooks/useDraft';
import {AiProvider} from '../contexts/AiContext';
import {AuthGate} from '../auth/AuthGate';
import {adaptivePollInterval} from '../lib/sharedQueries';
import {qh} from '../lib/api';
import type {Health} from '../types/qhealth';

const mockUseAuth=vi.fn();
vi.mock('../auth/AuthProvider',()=>({
  useAuth:()=>mockUseAuth(),
}));

vi.mock('../auth/GuestMigrationProvider',()=>({
  useGuestMigration:()=>({
    migration:null,
    hasMigratableState:false,
    beginUpgrade:vi.fn(),
    continueGuestSession:vi.fn(),
    retryMigration:vi.fn(),
    dismissMigrationNotice:vi.fn(),
  }),
}));

vi.mock('../lib/api',()=>({
  setSessionToken:vi.fn(),
  api:{get:vi.fn(()=>Promise.resolve([])),post:vi.fn(()=>Promise.resolve({})),remove:vi.fn(()=>Promise.resolve(undefined))},
  qh:{
    alignment:vi.fn(()=>Promise.resolve({
      contract_version:'2026-09-30',
      models:[
        {model_id:'logistic_regression',display_name:'Logistic Regression',category:'classical',implementation_status:'AVAILABLE',executable:true},
        {model_id:'hybrid_pennylane_torch',display_name:'PennyLane + PyTorch Hybrid',category:'hybrid quantum-classical',implementation_status:'AVAILABLE',executable:true},
      ],
      frameworks:{},
      showcase:{
        id:'early-stage-diabetes',
        display_name:'Early Stage Diabetes Risk Prediction',
        label:'Featured SIH demonstration',
        featured_dataset_slug:'early-stage-diabetes',
        disease_domain:'endocrinology',
        target:'diabetes_status',
        positive_class:'positive',
        dataset_hash:'hash',
        research_only_disclaimer:'Research benchmark only.',
        recommended_models:[],
      },
      flagship_experiment_preset:{
        id:'sih-diabetes-demonstration',
        display_name:'SIH Diabetes Demonstration',
        dataset_slug:'early-stage-diabetes',
        models:[],
        auto_start_training:false,
        threshold_strategy:'target_sensitivity',
        evidence_requirements:[],
      },
      flagship_architecture:{
        model_id:'hybrid_pennylane_torch',
        status:'IMPLEMENTED',
        stages:['Classical preprocessing','PennyLane quantum circuit','PyTorch classical output head','SHAP explanation'],
      },
    })),
    health:vi.fn(()=>Promise.resolve({
      status:'ok',
      version:'test',
      mode:'local',
      authentication_required:false,
      quantum:{available:true,runtime_verified:true,execution:'local simulation'},
      disclaimer:'Research only',
    })),
    systemStatus:vi.fn(()=>Promise.resolve({
      status:'ok',
      version:'test',
      mode:'local',
      database_available:true,
      storage_available:true,
      quantum:{available:true,runtime_verified:true,execution:'local simulation'},
      model_capabilities:[],
      supported_models:{classical:[],quantum:[],qiskit_quantum:[],pennylane_hybrid:[]},
      jobs:{queued:0,running:0,active:0},
    })),
    summary:vi.fn(()=>Promise.resolve({
      counts:{datasets:5,experiments:1,ready_models:7,active_jobs:0},
      recent_experiments:[],
      disclaimer:'Research only',
    })),
    jobs:vi.fn(()=>Promise.resolve([])),
    models:vi.fn(()=>Promise.resolve([])),
    experiments:vi.fn(()=>Promise.resolve([])),
    datasets:vi.fn(()=>Promise.resolve([])),
    datasetLibrary:vi.fn(()=>Promise.resolve([
      {
        slug:'early-stage-diabetes',
        name:'Early Stage Diabetes Risk Prediction',
        domain:'endocrinology',
        row_count:520,
        feature_count:16,
        target:'diabetes_status',
        positive_label:'positive',
        showcase_priority:1,
        registered:true,
        demo_readiness:{
          status:'ready',
          instant_demo_available:true,
          artifact_version:'2026-09-30',
          experiment_id:'exp-diabetes-flagship',
          model_ids:['logistic_regression','hybrid_pennylane_torch'],
          verified_dataset_hash:'hash',
          verified_artifact_manifest_hash:'manifest',
        },
      },
    ])),
  },
}));

function renderShell(ui:React.ReactNode=<div>Content</div>,initialEntries=['/']){
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={initialEntries}>
          <DraftProvider>
            <AiProvider>{ui}</AiProvider>
          </DraftProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

beforeEach(()=>{
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  document.documentElement.className='';
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-motion');
  mockUseAuth.mockReturnValue({
    user:null,
    session:null,
    profile:null,
    accessToken:null,
    loading:false,
    signingOut:false,
    isAuthenticated:false,
    isGuest:true,
    isConfigured:false,
    error:null,
    signInWithGoogle:vi.fn(),
    signInWithGitHub:vi.fn(),
    continueAsGuest:vi.fn(),
    signOut:vi.fn(),
    clearError:vi.fn(),
  });
});

describe('final frontend polish & production QA regressions',()=>{
  it('FIX 1: provides accessible title tooltips on all flagship overview statistics for long dataset names',async()=>{
    renderShell(<Overview/>);
    await screen.findAllByText('Early Stage Diabetes Risk Prediction');
    const statsGrid=document.querySelector('.flagship-stats') as HTMLElement|null;
    expect(statsGrid).not.toBeNull();
    const statHeading=await within(statsGrid!).findByText('Early Stage Diabetes Risk Prediction');
    expect(statHeading).toHaveAttribute('title','Early Stage Diabetes Risk Prediction');
    const statContainer=statHeading.closest('div');
    expect(statContainer).toHaveAttribute('title','Early Stage Diabetes Risk Prediction');

    const statCells=statsGrid!.querySelectorAll(':scope > div');
    expect(statCells).toHaveLength(4);
    statCells.forEach(cell=>{
      expect(cell).toHaveAttribute('title');
      expect(cell.querySelector('strong')).toHaveAttribute('title');
    });
  });

  it('FIX 2: applies truthful is-loading, is-live, and is-offline classes directly to .status-dot',async()=>{
    let resolveHealth!:(val:Health)=>void;
    vi.mocked(qh.health).mockImplementationOnce(()=>new Promise<Health>(resolve=>{resolveHealth=resolve;}));

    const {unmount}=renderShell(<ResearchShell><div>Workspace</div></ResearchShell>);
    const topbarIndicator=document.querySelector('.topbar-actions .connection-indicator');
    const topbarDot=topbarIndicator?.querySelector('.status-dot');
    expect(topbarDot).toHaveClass('is-loading');
    expect(topbarIndicator?.textContent).toContain('Checking connection');

    resolveHealth({
      status:'ok',
      version:'test',
      mode:'local',
      authentication_required:false,
      quantum:{available:true,runtime_verified:true,execution:'local simulation'},
      disclaimer:'Research only',
    });

    await waitFor(()=>{
      expect(topbarDot).toHaveClass('is-live');
      expect(topbarIndicator?.textContent).toContain('Connected');
    });
    unmount();

    vi.mocked(qh.systemStatus).mockResolvedValueOnce({
      status:'degraded',
      version:'test',
      mode:'local',
      database_available:false,
      storage_available:true,
      quantum:{available:false,runtime_verified:false,execution:'unavailable'},
      model_capabilities:[],
      supported_models:{classical:[],quantum:[],qiskit_quantum:[],pennylane_hybrid:[]},
      jobs:{queued:0,running:0,active:0},
    });
    renderShell(<ResearchShell><div>Workspace</div></ResearchShell>);
    await waitFor(()=>{
      const dot=document.querySelector('.topbar-actions .connection-indicator .status-dot');
      expect(dot).toHaveClass('is-offline');
      expect(document.querySelector('.topbar-actions .connection-indicator')?.textContent).toContain('Backend/DB unavailable');
    });
  });

  it('FIX 3: disables Google/GitHub OAuth buttons and promotes Guest access when Supabase is not configured',async()=>{
    const continueAsGuest=vi.fn();
    const signInWithGoogle=vi.fn();
    mockUseAuth.mockReturnValue({
      user:null,
      session:null,
      profile:null,
      accessToken:null,
      loading:false,
      signingOut:false,
      isAuthenticated:false,
      isGuest:false,
      isConfigured:false,
      error:'OAuth prompt test',
      signInWithGoogle,
      signInWithGitHub:vi.fn(),
      continueAsGuest,
      signOut:vi.fn(),
      clearError:vi.fn(),
    });

    renderShell(<AuthGate><div>Protected</div></AuthGate>);
    const googleBtn=await screen.findByRole('button',{name:/Continue with Google \(Unavailable\)/i});
    const githubBtn=screen.getByRole('button',{name:/Continue with GitHub \(Unavailable\)/i});
    const guestBtn=screen.getByRole('button',{name:/Continue as Guest/i});

    expect(googleBtn).toBeDisabled();
    expect(githubBtn).toBeDisabled();
    expect(googleBtn).toHaveClass('is-unavailable');
    expect(githubBtn).toHaveClass('is-unavailable');
    expect(guestBtn).toHaveClass('is-primary-action');

    fireEvent.click(googleBtn);
    expect(signInWithGoogle).not.toHaveBeenCalled();

    fireEvent.click(guestBtn);
    expect(continueAsGuest).toHaveBeenCalledTimes(1);
  });

  it('FIX 4: traps focus, supports Escape dismissal, restores trigger focus, and labels inputs in modals',async()=>{
    renderShell(<ResearchShell><AiPopup/><div>Workspace</div></ResearchShell>);

    // 1. Theme & layout drawer
    const layoutTrigger=screen.getByRole('button',{name:/Open theme and layout settings/i});
    layoutTrigger.focus();
    fireEvent.click(layoutTrigger);
    const configDialog=screen.getByRole('dialog',{name:/Theme and layout settings/i});
    expect(configDialog).toBeInTheDocument();
    fireEvent.keyDown(window,{key:'Escape'});
    expect(screen.queryByRole('dialog',{name:/Theme and layout settings/i})).not.toBeInTheDocument();
    expect(document.activeElement).toBe(layoutTrigger);

    // 2. Connection settings popover
    const connTrigger=screen.getByRole('button',{name:/Connection settings/i});
    connTrigger.focus();
    fireEvent.click(connTrigger);
    const connDialog=screen.getByRole('dialog',{name:/Connection settings/i});
    expect(within(connDialog).getByLabelText(/Optional local API token/i)).toBeInTheDocument();
    fireEvent.keyDown(window,{key:'Escape'});
    expect(screen.queryByRole('dialog',{name:/Connection settings/i})).not.toBeInTheDocument();
    expect(document.activeElement).toBe(connTrigger);

    // 3. AI Assistant popup
    const aiTrigger=screen.getByRole('button',{name:'Open EntangleX AI Assistant'});
    aiTrigger.focus();
    fireEvent.click(aiTrigger);
    const aiDialog=screen.getByRole('dialog',{name:/AI Assistant/i});
    expect(within(aiDialog).getByLabelText(/Ask EntangleX AI Assistant/i)).toBeInTheDocument();
    fireEvent.keyDown(window,{key:'Escape'});
    expect(screen.queryByRole('dialog',{name:/AI Assistant/i})).not.toBeInTheDocument();
    expect(document.activeElement).toBe(aiTrigger);
  });

  it('FIX 5: deduplicates shared queries across ResearchShell and Overview and halts polling on error state',async()=>{
    renderShell(<ResearchShell><Overview/></ResearchShell>);
    await screen.findAllByText('Early Stage Diabetes Risk Prediction');

    expect(qh.summary).toHaveBeenCalledTimes(1);
    expect(qh.health).toHaveBeenCalledTimes(1);
    expect(qh.systemStatus).toHaveBeenCalledTimes(1);
    expect(qh.datasetLibrary).toHaveBeenCalledTimes(1);
    expect(qh.alignment).toHaveBeenCalledTimes(1);

    const pollFn=adaptivePollInterval(10000);
    expect(pollFn({state:{status:'success'}})).toBe(10000);
    expect(pollFn({state:{status:'error'}})).toBe(false);
  });

  it('FIX 6: toggles collapsed sidebar state and opens/closes mobile More navigation sheet with Escape',async()=>{
    const originalMatchMedia=window.matchMedia;
    window.matchMedia=vi.fn().mockImplementation((query:string)=>({
      matches:query.includes('max-width: 767px'),
      media:query,
      onchange:null,
      addListener:vi.fn(),
      removeListener:vi.fn(),
      addEventListener:vi.fn(),
      removeEventListener:vi.fn(),
      dispatchEvent:vi.fn(),
    }));
    try {
      renderShell(<ResearchShell><div>Workspace</div></ResearchShell>);
      const shell=document.querySelector('.research-shell')!;
      expect(shell).not.toHaveClass('is-collapsed');

      const collapseBtn=screen.getByRole('button',{name:/Collapse sidebar/i});
      fireEvent.click(collapseBtn);
      expect(shell).toHaveClass('is-collapsed');

      const moreBtn=screen.getByRole('button',{name:/Open more navigation/i});
      moreBtn.focus();
      fireEvent.click(moreBtn);
      expect(screen.getByRole('dialog',{name:/Research navigation/i})).toBeInTheDocument();
      fireEvent.keyDown(window,{key:'Escape'});
      expect(screen.queryByRole('dialog',{name:/Research navigation/i})).not.toBeInTheDocument();
      expect(document.activeElement).toBe(moreBtn);
    } finally {
      window.matchMedia=originalMatchMedia;
    }
  });
});
