import type { compensationBasisLabels } from "../../lib/provider-compensation";

/** Whole-rial calculation only; never posts revenue or treats a proposal as an active contract.
 * Fractional rials stay with the institute. Fees are always borne by the institute.
 */
export function calculateProviderCompensation(input:{
  instituteShareBeforeFeeRials:number;
  gatewayFeeRials:number;
  shareBasis:keyof typeof compensationBasisLabels;
  shareBasisPoints:number;
}) {
  const {instituteShareBeforeFeeRials,gatewayFeeRials,shareBasisPoints,shareBasis}=input;
  if(!Number.isSafeInteger(instituteShareBeforeFeeRials)||instituteShareBeforeFeeRials<0||
    !Number.isSafeInteger(gatewayFeeRials)||gatewayFeeRials<0||gatewayFeeRials>instituteShareBeforeFeeRials||
    !Number.isInteger(shareBasisPoints)||shareBasisPoints<0||shareBasisPoints>10000||
    !["institute_before_fee","institute_after_fee"].includes(shareBasis)) throw new RangeError("invalid_compensation_amount");
  const afterFee=instituteShareBeforeFeeRials-gatewayFeeRials;
  const basis=shareBasis==="institute_before_fee"?instituteShareBeforeFeeRials:afterFee;
  const providerShareRials=Number(BigInt(basis)*BigInt(shareBasisPoints)/BigInt(10000));
  if(providerShareRials>afterFee) throw new RangeError("institute_share_insufficient_for_fee");
  return {basisRials:basis,providerShareRials,instituteNetRials:afterFee-providerShareRials,gatewayFeeRials};
}
