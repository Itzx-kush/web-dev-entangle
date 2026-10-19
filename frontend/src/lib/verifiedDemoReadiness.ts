import type {DatasetLibraryItem} from '../types/qhealth';

/**
 * Prefer the configured featured dataset when it is present. If the separate alignment
 * contract has not loaded (or does not name an item in this catalogue), use the catalogue's
 * explicitly verified instant-demo item instead of treating the demo as unavailable.
 * A present-but-not-ready featured item is not silently replaced with a different dataset.
 */
export function selectFlagshipDataset(
  library:DatasetLibraryItem[]|undefined,
  featuredSlug:string|undefined,
):DatasetLibraryItem|undefined{
  if(!library?.length)return undefined;
  const configured=featuredSlug?library.find(item=>item.slug===featuredSlug):undefined;
  if(configured)return configured;
  return library.find(item=>item.demo_readiness.status==='ready'&&item.demo_readiness.instant_demo_available===true);
}
