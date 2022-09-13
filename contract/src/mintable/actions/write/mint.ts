import { ContractResult, PstAction, PstState } from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const mint = async (
  state: PstState,
  { caller, input: { qty } }: PstAction
): Promise<ContractResult> => {
  qty = Math.floor(qty);
  if (qty > state.mintable) {
    qty = state.mintable;
  }
  const balances = state.balances;
  const txTarget: string = SmartWeave.transaction.target;
  const txQuantity: string = SmartWeave.transaction.quantity;

  if (txTarget !== state.owner) {
    throw new ContractError(`Mint fee sent to wrong target`);
  }
  if (!qty || !Number.isInteger(qty)) {
    throw new ContractError('quantity format error');
  }

  const arQty = Number(await SmartWeave.arweave.ar.winstonToAr(txQuantity));
  if (qty * state.mintPrice * 0.995 > arQty) {
    qty = Math.floor(arQty / state.mintPrice);
  }

  if (caller in balances) {
    balances[caller] += qty;
  } else {
    balances[caller] = qty;
  }
  state.mintable -= qty;

  return { state };
};
