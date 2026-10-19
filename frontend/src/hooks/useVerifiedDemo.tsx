import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {useQuery} from '@tanstack/react-query';
import {qh} from '../lib/api';
import type {Dataset,DatasetLibraryItem,ModelRecord,VerifiedEvidencePackage} from '../types/qhealth';
import {selectFlagshipDataset} from '../lib/verifiedDemoReadiness';

type DemoContextValue={
  active:boolean;
  experimentId:string|null;
  datasetId:string|null;
  activate:(experimentId:string,datasetId:string)=>void;
  deactivate:()=>void;
};

const DemoContext=createContext<DemoContextValue|null>(null);
const STORAGE_KEY='qhealth-verified-demo-context';
const FALLBACK_CONTEXT:DemoContextValue={
  active:false,experimentId:null,datasetId:null,activate:()=>undefined,deactivate:()=>undefined,
};

export function VerifiedDemoProvider({children}:{children:ReactNode}){
  const [state,setState]=useState<{active:boolean;experimentId:string|null;datasetId:string|null}>(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
      return {active:Boolean(saved.active),experimentId:saved.experimentId||null,datasetId:saved.datasetId||null};
    }catch{return {active:false,experimentId:null,datasetId:null}}
  });
  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));window.dispatchEvent(new Event('qhealth-guest-state-changed'))}catch{}},[state]);
  return <DemoContext.Provider value={{
    ...state,
    activate:(experimentId,datasetId)=>setState({active:true,experimentId,datasetId}),
    deactivate:()=>setState({active:false,experimentId:null,datasetId:null}),
  }}>{children}</DemoContext.Provider>;
}

export function useVerifiedDemo(){
  return useContext(DemoContext)||FALLBACK_CONTEXT;
}

export function useFlagshipData(requireActive=false){
  const context=useVerifiedDemo();
  const alignment=useQuery({queryKey:['alignment'],queryFn:qh.alignment,staleTime:300000});
  const library=useQuery({queryKey:['dataset-library'],queryFn:qh.datasetLibrary,staleTime:30000});
  const slug=alignment.data?.showcase.featured_dataset_slug;
  const item=useMemo<DatasetLibraryItem|undefined>(()=>selectFlagshipDataset(library.data,slug),[library.data,slug]);
  // The verified package is selected from the backend readiness catalogue, so a slow or failed
  // alignment request cannot make an otherwise-ready instant demo appear unavailable.
  // The catalogue's ID is authoritative once loaded; ignore stale IDs saved by older sessions.
  const catalogExperimentId=item?.demo_readiness.status==='ready'?item.demo_readiness.experiment_id:null;
  const experimentId=catalogExperimentId||(!item?context.experimentId:null)||null;
  const enabled=Boolean(experimentId)&&(!requireActive||context.active);
  const verified=useQuery({
    queryKey:['verified-evidence',experimentId],
    queryFn:()=>qh.verifiedEvidence(experimentId as string),
    enabled,
    staleTime:300000,
    retry:1,
  });
  const payload=verified.data;
  // Alignment is supplemental: once the catalogue has selected a ready package, don't hold
  // the demo UI behind a separate alignment request. Wait on alignment only when no catalogue
  // item is available yet and the fallback decision is still unresolved.
  const isLoading=library.isLoading||(!item&&alignment.isLoading)||(Boolean(experimentId)&&verified.isLoading);
  return {
    context,alignment,library,item,experimentId,verified,isLoading,
    payload,
    dataset:payload?.dataset as Dataset|undefined,
    models:(payload?.models||[]) as ModelRecord[],
    evidence:payload?.evidence as VerifiedEvidencePackage['evidence']|undefined,
    available:item?.demo_readiness.status==='ready'&&(item.demo_readiness.instant_demo_available!==false),
  };
}