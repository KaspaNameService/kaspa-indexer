import type { ILogger } from "../logger/type";

export type Config = {
  retry: number;
  indexInterval: number;
};

export type IndexerOptions = {
  fromBlockHash: string;
  config: Config;
  logger: ILogger;
  rpc: any;
};

export type ValidTx = {
  tx: ITransaction;
  blockHash: HexString;
};

export type VCResult = {
  validTxs: ValidTx[];
  blocks: IGetBlocksResponse;
  lastVCBlock: string;
};

/*  Kaspa wasm types */

export enum Encoding {
  Borsh = 0,
  SerdeJson = 1,
}

export type HexString = string;

export interface ITransactionVerboseData {
  transactionId: HexString;
  hash: HexString;
  computeMass: bigint;
  blockHash: HexString;
  blockTime: bigint;
}

export interface IHeader {
  hash: HexString;
  version: number;
  parentsByLevel: Array<Array<HexString>>;
  hashMerkleRoot: HexString;
  acceptedIdMerkleRoot: HexString;
  utxoCommitment: HexString;
  timestamp: bigint;
  bits: number;
  nonce: bigint;
  daaScore: bigint;
  blueWork: bigint | HexString;
  blueScore: bigint;
  pruningPoint: HexString;
}

export interface IBlockVerboseData {
  hash: HexString;
  difficulty: number;
  selectedParentHash: HexString;
  transactionIds: HexString[];
  isHeaderOnly: boolean;
  blueScore: number;
  childrenHashes: HexString[];
  mergeSetBluesHashes: HexString[];
  mergeSetRedsHashes: HexString[];
  isChainBlock: boolean;
}

export interface IBlock {
  header: IHeader;
  transactions: ITransaction[];
  verboseData?: IBlockVerboseData;
}

export interface IGetBlocksResponse {
  blockHashes: HexString[];
  blocks: IBlock[];
}

export interface ITransactionOutput {
  value: bigint;
  scriptPublicKey: IScriptPublicKey | HexString;

  /** Optional verbose data provided by RPC */
  verboseData?: ITransactionOutputVerboseData;
}

export interface ITransactionOutputVerboseData {
  scriptPublicKeyType: string;
  scriptPublicKeyAddress: string;
}

export interface IScriptPublicKey {
  version: number;
  script: HexString;
}

export interface ITransactionOutpoint {
  transactionId: HexString;
  index: number;
}

export interface ITransactionInputVerboseData {}

export interface ITransactionInput {
  previousOutpoint: ITransactionOutpoint;
  signatureScript?: HexString;
  sequence: bigint;
  sigOpCount: number;
  utxo?: any;

  /** Optional verbose data provided by RPC */
  verboseData?: ITransactionInputVerboseData;
}

export interface ITransaction {
  version: number;
  inputs: ITransactionInput[];
  outputs: ITransactionOutput[];
  lockTime: bigint;
  subnetworkId: HexString;
  gas: bigint;
  payload: HexString;
  /** The mass of the transaction (the mass is undefined or zero unless explicitly set or obtained from the node) */
  mass?: bigint;

  /** Optional verbose data provided by RPC */
  verboseData?: ITransactionVerboseData;
}

export interface IAcceptedTransactionIds {
  acceptingBlockHash: HexString;
  acceptedTransactionIds: HexString[];
}

export interface IGetVirtualChainFromBlockResponse {
  removedChainBlockHashes: HexString[];
  addedChainBlockHashes: HexString[];
  acceptedTransactionIds: IAcceptedTransactionIds[];
}
