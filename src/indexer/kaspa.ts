import type {
  HexString,
  IGetBlocksResponse,
  IGetVirtualChainFromBlockResponse,
  ITransaction,
  ValidTx,
  VCResult,
} from "./type";
import type { ILogger } from "../logger/type";

export class Kaspa {
  rpc: any;
  logger: ILogger;

  constructor(logger: ILogger, rpc: any) {
    this.logger = logger;
    this.rpc = rpc;
  }

  async connect() {
    await this.rpc.connect();
    this.logger.info("rpc connected!");
  }

  async getIndexBlock(fromBlockHash: string) {
    this.logger.debug("init fromBlockHash: %s", fromBlockHash);

    if (fromBlockHash === "latest") {
      const blockDag = await this.rpc.getBlockDagInfo().catch((e: any) => {
        this.logger.error("error getting block dag info: %s", e);
        throw e;
      });
      fromBlockHash = blockDag.pruningPointHash;
    }

    this.logger.info("fetching from block: %s", fromBlockHash);
    return fromBlockHash;
  }

  async getBlocks(fromBlockHash: string) {
    return await this.rpc
      .getBlocks({
        lowHash: fromBlockHash,
        includeBlocks: true,
        includeTransactions: true,
      })
      .catch((e: any) => {
        this.logger.error("error getting blocks: %s", e);
        throw e;
      });
  }

  getNextIndexBlock(blocks: IGetBlocksResponse) {
    if (blocks.blockHashes.length === 0) {
      return "latest";
    }
    // use the last blocks hash as the new lowHash
    return blocks.blockHashes[blocks.blockHashes.length - 1];
  }

  static filterRemovedBlocks(
    blocks: IGetBlocksResponse,
    removedChainBlockHashes: HexString[]
  ): IGetBlocksResponse {
    const blks = blocks.blocks.filter(
      (cb) => !removedChainBlockHashes.includes(cb.header.hash)
    );
    const hashes = blks.map((b) => b.header.hash);
    return {
      blocks: blks,
      blockHashes: hashes,
    };
  }

  // 1. filter out txs that are unaccepted in the vchain
  // 2. dedupe txs
  static getValidTxsFromVC(
    txs: ITransaction[],
    vc: IGetVirtualChainFromBlockResponse
  ) {
    const accptedMap = new Map<HexString, HexString>(); // txId -> blockHash
    const dedupeMap = new Map<HexString, boolean>(); // txId -> boolean

    vc.acceptedTransactionIds.forEach((b) => {
      b.acceptedTransactionIds.forEach((txId) => {
        accptedMap.set(txId, b.acceptingBlockHash);
      });
    });

    const validTxs: ValidTx[] = txs
      .filter((tx) => {
        const id = tx.verboseData?.transactionId || "";
        const valid = id && accptedMap.has(id) && !dedupeMap.has(id);
        dedupeMap.set(id, true);
        return valid;
      })
      .map((tx) => ({
        tx,
        blockHash: accptedMap.get(tx.verboseData?.transactionId || "") || "",
      }));

    return validTxs;
  }

  /*
   * @return blocks: pruned removed ones
   * @return validTxs: txs that are accepted in the vchain
   * @return lastVCBlock: for future handleVChain calls
   */
  async handleVChain(
    fromBlockHash: string,
    currentBlks: IGetBlocksResponse,
    lastKnownVSCPBlock: string
  ): Promise<VCResult> {
    if (!this.rpc) {
      throw new Error("rpc not connected");
    }

    this.logger.info("get virtual chain");
    const vspc = await this.rpc
      .getVirtualChainFromBlock({
        startHash: lastKnownVSCPBlock || fromBlockHash,
        includeAcceptedTransactionIds: true,
      })
      .catch((e: unknown) => {
        if (e instanceof Error) {
          this.logger.error("error getting virtual chain: %s", e);
        } else {
          this.logger.error("Unexpected error: %s", e);
        }
        throw e;
      });

    let blocks = Kaspa.filterRemovedBlocks(
      currentBlks,
      vspc.removedChainBlockHashes
    );

    const txs = blocks.blocks.flatMap((b) => b.transactions);
    this.logger.debug("# of txs: %s", txs.length);
    const validTxs = Kaspa.getValidTxsFromVC(txs, vspc);
    this.logger.debug("# of valid txs: %s", validTxs.length);

    const lastVCBlock =
      vspc.acceptedTransactionIds.length === 0
        ? ""
        : vspc.acceptedTransactionIds[vspc.acceptedTransactionIds.length - 1]
            .acceptingBlockHash;
    this.logger.debug("lastVCBlock: %s", lastVCBlock);

    return {
      validTxs,
      lastVCBlock,
      blocks,
    };
  }
}
