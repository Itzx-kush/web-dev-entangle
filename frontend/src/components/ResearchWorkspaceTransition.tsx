import {useEffect} from 'react';

export function ResearchWorkspaceTransition({onComplete}:{guest:boolean;onComplete:()=>void}){
  useEffect(()=>{
    const id=window.requestAnimationFrame(()=>onComplete());
    return()=>window.cancelAnimationFrame(id);
  },[onComplete]);

  return null;
}
