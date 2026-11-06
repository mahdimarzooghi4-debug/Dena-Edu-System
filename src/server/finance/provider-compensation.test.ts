import { expect,test } from "vitest";
import { calculateProviderCompensation } from "./provider-compensation";
const base={instituteShareBeforeFeeRials:9000,gatewayFeeRials:100,shareBasisPoints:5000};
test("provider share follows the agreed fee basis, preserving institute fee responsibility",()=>{
  expect(calculateProviderCompensation({...base,shareBasis:"institute_before_fee"})).toEqual({basisRials:9000,providerShareRials:4500,instituteNetRials:4400,gatewayFeeRials:100});
  expect(calculateProviderCompensation({...base,shareBasis:"institute_after_fee"})).toEqual({basisRials:8900,providerShareRials:4450,instituteNetRials:4450,gatewayFeeRials:100});
});
test("fractional rials and large integer arithmetic preserve the total",()=>{
  const result=calculateProviderCompensation({...base,instituteShareBeforeFeeRials:Number.MAX_SAFE_INTEGER,gatewayFeeRials:0,shareBasisPoints:3333,shareBasis:"institute_after_fee"});
  expect(result.providerShareRials).toBe(Number(BigInt(Number.MAX_SAFE_INTEGER)*BigInt(3333)/BigInt(10000)));
  expect(result.providerShareRials+result.instituteNetRials).toBe(Number.MAX_SAFE_INTEGER);
  expect(calculateProviderCompensation({...base,instituteShareBeforeFeeRials:3,gatewayFeeRials:0,shareBasis:"institute_after_fee"}).providerShareRials).toBe(1);
});
test("invalid amounts and unfunded gateway fees cannot produce a posting",()=>{
  for(const amount of[-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1]) expect(()=>calculateProviderCompensation({...base,instituteShareBeforeFeeRials:amount,shareBasis:"institute_after_fee"})).toThrow();
  expect(()=>calculateProviderCompensation({...base,shareBasisPoints:10001,shareBasis:"institute_after_fee"})).toThrow();
  expect(()=>calculateProviderCompensation({...base,shareBasisPoints:10000,shareBasis:"institute_before_fee"})).toThrow("institute_share_insufficient_for_fee");
});
