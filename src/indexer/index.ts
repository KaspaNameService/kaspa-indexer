import { sleep } from "../utils/utils";
import { Kaspa } from "./kaspa";
import retry from "async-retry";
import type { Config, IndexerOptions, VCResult } from "./type";
import type { ILogger } from "../logger/type";

// Reference: https://github.com/lAmeR1/kaspa-check-txs-example/blob/main/main.py
export default abstract class Indexer {
  fromBlockHash = "";
  nextBlockKey: string = "";
  nextLastKnownVSPCBlockKey: string = "";
  kaspa: Kaspa;
  config: Config;
  logger: ILogger;
  rpc: any;

  constructor(opt: IndexerOptions) {
    this.fromBlockHash = opt.fromBlockHash;
    this.config = opt.config;
    this.logger = opt.logger;
    this.rpc = opt.rpc;
  }

  async start() {
    const indexerId = this.getId();
    this.nextBlockKey = `nextBlock-${indexerId}`;
    this.nextLastKnownVSPCBlockKey = `nextLastKnownVSCPBlock-${indexerId}`;
    this.logger.info(`Starting indexer, id: ${indexerId}`);

    this.kaspa = new Kaspa(this.logger, this.rpc);
    await this.kaspa.connect().catch((e) => {
      this.logger.error("error connecting to rpc: %s", e);
      throw e;
    });

    // first run
    await retry(
      async () => {
        await this.index(this.fromBlockHash, "").catch((e) => {
          this.logger.error(
            "error fetching from block in the first run: %s",
            e
          );
          throw e;
        });
      },
      {
        retries: this.config.retry,
      }
    );

    await retry(
      async () => {
        await this.runNext().catch((e) => {
          this.logger.error("error running next: %s", e);
          throw e;
        });
      },
      {
        retries: this.config.retry,
      }
    );
  }

  async runNext() {
    while (true) {
      const nextIndexBlk = await this.getStored(this.nextBlockKey).catch(
        (e: any) => {
          this.logger.error("error getting stored next block: %s", e);
          throw e;
        }
      );

      const nextLastKnownVSCPBlock = await this.getStored(
        this.nextLastKnownVSPCBlockKey
      ).catch((e: any) => {
        this.logger.error("error getting stored next vspc block: %s", e);
        throw e;
      });

      this.logger.info("lastKnownVSCPBlock: %s", nextLastKnownVSCPBlock);
      this.logger.info("nextIndexBlk: %s", nextIndexBlk);

      if (nextIndexBlk) {
        await this.index(nextIndexBlk, nextLastKnownVSCPBlock || "").catch(
          (e) => {
            this.logger.error("error indexing next: %s", e);
            throw e;
          }
        );
      } else {
        this.logger.info("no next indexing block, using latest");
        await sleep(this.config.indexInterval);
        await this.index("latest", "").catch((e) => {
          this.logger.error("error fetching from block: %s", e);
          throw e;
        });
      }
    }
  }

  async index(fromBlockHash: string, lastKnownVSCPBlock: string) {
    fromBlockHash = await this.kaspa.getIndexBlock(fromBlockHash);
    let blocks = await this.kaspa.getBlocks(fromBlockHash);

    if (blocks.blocks.length > 0) {
      this.logger.info(
        "last block timestamp: %s",
        blocks.blocks[blocks.blocks.length - 1].header.timestamp.toString()
      );
    }

    const nextBlkHash = this.kaspa.getNextIndexBlock(blocks);

    // check if the block is already indexed
    const storedBlock = await this.getStoredBlock(fromBlockHash);
    if (storedBlock) {
      await this.setNextIndexBlock(nextBlkHash, fromBlockHash, "");
      this.logger.info("block already indexed: %s", fromBlockHash);
      return;
    }

    const vcResult = await this.kaspa.handleVChain(
      fromBlockHash,
      blocks,
      lastKnownVSCPBlock
    );

    await this.handleTransactions(vcResult);

    await this.setNextIndexBlock(
      nextBlkHash,
      fromBlockHash,
      vcResult.lastVCBlock
    );
  }

  private async setNextIndexBlock(
    nextBlkHash: string,
    fromBlockHash: string,
    lastKnownVSCPBlock: string
  ) {
    if (nextBlkHash !== fromBlockHash || nextBlkHash === "latest") {
      await this.storeNext(nextBlkHash, lastKnownVSCPBlock);
    } else {
      // clear stored to index latest
      await this.clearStored();
    }
  }

  abstract handleTransactions(vcRes: VCResult): Promise<void>;
  abstract getId(): string;
  abstract clearStored(): Promise<void>;
  abstract storeNext(
    nextBlkHash: string,
    lastKnownVSCPBlock: string
  ): Promise<void>;
  abstract getStored(key: string): Promise<any>;
  abstract getStoredBlock(blockHash: string): Promise<any>;
}
