import {describe,expect,it} from 'vitest';
import type {DatasetLibraryItem} from '../types/qhealth';
import {selectFlagshipDataset} from '../lib/verifiedDemoReadiness';

function item(slug:string,status:'ready'|'requires_processing',instant:boolean):DatasetLibraryItem{
  return {slug,demo_readiness:{status,instant_demo_available:instant}} as DatasetLibraryItem;
}

const diabetes=item('early-stage-diabetes','ready',true);
const wdbc=item('wdbc','requires_processing',false);

describe('verified flagship dataset selection',()=>{
  it('uses the configured featured dataset when it exists in the catalogue',()=>{
    expect(selectFlagshipDataset([wdbc,diabetes],'wdbc')).toBe(wdbc);
  });

  it('falls back to the catalogue-verified instant demo when alignment has not loaded',()=>{
    expect(selectFlagshipDataset([wdbc,diabetes],undefined)).toBe(diabetes);
  });

  it('falls back to the verified item when the alignment slug is not in the catalogue',()=>{
    expect(selectFlagshipDataset([wdbc,diabetes],'stale-slug')).toBe(diabetes);
  });

  it('does not substitute a different dataset when a configured featured item is present but not ready',()=>{
    expect(selectFlagshipDataset([wdbc,diabetes],'wdbc')).toBe(wdbc);
  });

  it('returns no item when the catalogue contains no verified instant demo',()=>{
    expect(selectFlagshipDataset([wdbc],undefined)).toBeUndefined();
  });
});
