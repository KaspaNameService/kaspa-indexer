import { Indexer } from "kaspa-indexer";
import customLogger from "./logger";
import type { Config, VCResult } from "../src/indexer/type";
import type { ILogger } from "../src/logger/type";

class MyIndexer extends Indexer {
  constructor(config: Config, logger: ILogger) {
    super({
      config, logger,
      fromBlockHash: "",
      rpc: undefined
    });
    this.config = config;
    this.logger = logger;
  }
  handleTransactions(vcRes: VCResult): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getId(): string {
    return "MyCustomIndexer";
  }

  async clearStored(): Promise<void> {
    // Clear stored data logic
    console.log("Clearing stored data...");
  }


  async storeNext(nextBlKHash: string, lastKnownVSCPBlock: string): Promise<void> {
    // Store the next block hash and last known block
    console.log("Storing next block hash:", nextBlKHash);
  }

  async getStored(key: string): Promise<any> {
    // Retrieve stored data logic
    console.log("Getting stored data for key:", key);
    return {}; // return retrieved data
  }

  async getStoredBlock(blockHash: string): Promise<any> {
    // Retrieve a stored block by its hash
    console.log("Getting stored block for hash:", blockHash);
    return {}; // return the block data
  }
}

// Example usage
async function main() {
  const config: Config = {
    retry: 0,
    indexInterval: 0
  };
  const logger: ILogger = customLogger

  const myIndexer = new MyIndexer(config, logger);

  // Start the indexer
  await myIndexer.start();

  // Run the next indexing step
  await myIndexer.runNext();
}

main().catch(console.error);
