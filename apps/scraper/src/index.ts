#!/usr/bin/env node
import { Command } from 'commander';
import { runDiscovery } from './discovery';
import { startWorkerPool } from './workers/pool';
import { initFirebase } from './firebase/admin';
import { config } from './config';

const program = new Command();

program
  .name('scraper')
  .description('Dealership Intelligence Scraper')
  .version('1.0.0');

program
  .command('discover')
  .description('Run the URL discovery pipeline (Google CSE + dealer directories)')
  .option('--states <states>', 'Comma-separated state codes (e.g. TX,CA,FL)', '')
  .option('--cities <cities>', 'Comma-separated city names', '')
  .option('--brands <brands>', 'Comma-separated car brands', '')
  .option('--limit <n>', 'Max URLs to discover per source', '1000')
  .action(async (opts) => {
    console.log('[scraper] Starting discovery pipeline...');
    initFirebase();
    await runDiscovery({
      states: opts.states ? opts.states.split(',').map((s: string) => s.trim()) : [],
      cities: opts.cities ? opts.cities.split(',').map((c: string) => c.trim()) : [],
      brands: opts.brands ? opts.brands.split(',').map((b: string) => b.trim()) : [],
      limit: parseInt(opts.limit, 10),
    });
    console.log('[scraper] Discovery complete.');
    process.exit(0);
  });

program
  .command('scrape')
  .description('Process the scrape queue (pull discovery_urls from Firestore and scrape)')
  .option('--concurrency <n>', 'Worker count (1-50)', String(config.concurrency))
  .option('--force-refresh', 'Re-scrape even if scraped within 30 days', false)
  .option('--job-id <id>', 'Attach to an existing job ID from the dashboard')
  .action(async (opts) => {
    console.log('[scraper] Starting scrape workers...');
    initFirebase();
    await startWorkerPool({
      concurrency: Math.min(50, Math.max(1, parseInt(opts.concurrency, 10))),
      forceRefresh: opts.forceRefresh as boolean,
      jobId: opts.jobId as string | undefined,
    });
    console.log('[scraper] Worker pool exited.');
    process.exit(0);
  });

program
  .command('run')
  .description('Discover then immediately scrape (full pipeline)')
  .option('--states <states>', 'Comma-separated state codes', '')
  .option('--brands <brands>', 'Comma-separated car brands', '')
  .option('--concurrency <n>', 'Worker count', String(config.concurrency))
  .option('--force-refresh', 'Re-scrape even if recently scraped', false)
  .action(async (opts) => {
    initFirebase();
    console.log('[scraper] Running full pipeline: discover → scrape');
    await runDiscovery({
      states: opts.states ? opts.states.split(',').map((s: string) => s.trim()) : [],
      cities: [],
      brands: opts.brands ? opts.brands.split(',').map((b: string) => b.trim()) : [],
      limit: 10_000,
    });
    await startWorkerPool({
      concurrency: Math.min(50, Math.max(1, parseInt(opts.concurrency, 10))),
      forceRefresh: opts.forceRefresh as boolean,
    });
    process.exit(0);
  });

program.parse(process.argv);
