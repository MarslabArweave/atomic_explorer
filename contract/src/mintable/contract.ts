import { balance } from './actions/read/balance';
import { transferTokens } from './actions/write/transferTokens';
import { mint } from './actions/write/mint';
import { ContractResult, PstAction, PstState } from './types/types';

declare const ContractError;

export async function handle(state: PstState, action: PstAction): Promise<ContractResult> {
  const input = action.input;

  switch (input.function) {
    case 'transfer':
      return await transferTokens(state, action);
    case 'balance':
      return await balance(state, action);
    case 'mint':
      return await mint(state, action);
    default:
      throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
  }
}
