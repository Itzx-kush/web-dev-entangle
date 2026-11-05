import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {AnimatedSection,ShinyText} from './reactbits';

export const stages=[
  ['Data','/datasets'],
  ['Quality','/quality'],
  ['Preprocess','/preprocessing'],
  ['Features','/features'],
  ['PCA','/pca'],
  ['Train','/training'],
  ['Compare','/comparison'],
  ['Robustness','/robustness'],
  ['Explain','/explainability'],
  ['Predict','/prediction'],
  ['Experiments','/experiments']
] as const;

export function StageNav({current}:{current:string}){
  return <AnimatedSection className="flex flex-wrap gap-2 border-y py-3">
    <span className="stage-chip border-primary/20 text-primary">
      <ShinyText>RESEARCH PATHWAY</ShinyText>
    </span>
    {stages.map((s,i)=>(
      <Link
        key={s[1]}
        to={s[1]}
        aria-current={current===s[1]?'page':undefined}
        className={'stage-chip ' + (current===s[1]?'bg-primary/10 text-primary border-primary/20 is-current':'border-border text-muted-foreground')}
        style={{animationDelay:`${i*35}ms`}}
      >
        {s[0]} <ArrowRight size={10}/>
      </Link>
    ))}
  </AnimatedSection>;
}
