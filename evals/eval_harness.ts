import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || '';
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

if (!API_KEY) {
  console.error('[Eval Harness] FATAL: GEMINI_API_KEY is not set in environment.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface CorpusDoc {
  id: string;
  title: string;
  category: string;
  text: string;
  embedding?: number[];
}

interface EvalQuery {
  id: string;
  source?: 'synthetic' | 'real';
  type: string;
  category: string;
  query: string;
  expected_doc_ids: string[];
  expected_answer_keywords: string[];
  is_answerable: boolean;
  notes?: string;
}

interface MetricAccumulator {
  totalQueries: number;
  answerableQueries: number;
  refusalQueries: number;
  evalTargetQueries: number;
  recallAt1Count: number;
  recallAt3Count: number;
  recallAt5Count: number;
  mrrSum: number;
  ndcgSum: number;
  precisionSum: number;
  correctnessCount: number;
  faithfulnessCount: number;
  answerRelevanceCount: number;
  refusalSuccessCount: number;
  latencies: number[];
  totalTokens: number;
}

function createAccumulator(): MetricAccumulator {
  return {
    totalQueries: 0,
    answerableQueries: 0,
    refusalQueries: 0,
    evalTargetQueries: 0,
    recallAt1Count: 0,
    recallAt3Count: 0,
    recallAt5Count: 0,
    mrrSum: 0,
    ndcgSum: 0,
    precisionSum: 0,
    correctnessCount: 0,
    faithfulnessCount: 0,
    answerRelevanceCount: 0,
    refusalSuccessCount: 0,
    latencies: [],
    totalTokens: 0
  };
}

function computeMetricsSummary(acc: MetricAccumulator) {
  if (acc.totalQueries === 0) return null;

  acc.latencies.sort((a, b) => a - b);
  const p50 = acc.latencies[Math.floor(acc.latencies.length * 0.50)] || 0;
  const p90 = acc.latencies[Math.floor(acc.latencies.length * 0.90)] || 0;
  const p95 = acc.latencies[Math.floor(acc.latencies.length * 0.95)] || 0;

  const retTarget = acc.evalTargetQueries > 0 ? acc.evalTargetQueries : 1;
  const ansCount = acc.answerableQueries > 0 ? acc.answerableQueries : 1;
  const refCount = acc.refusalQueries > 0 ? acc.refusalQueries : 1;

  const recallAt1 = acc.evalTargetQueries > 0 ? ((acc.recallAt1Count / retTarget) * 100).toFixed(1) : 'N/A';
  const recallAt3 = acc.evalTargetQueries > 0 ? ((acc.recallAt3Count / retTarget) * 100).toFixed(1) : 'N/A';
  const recallAt5 = acc.evalTargetQueries > 0 ? ((acc.recallAt5Count / retTarget) * 100).toFixed(1) : 'N/A';
  const mrr = acc.evalTargetQueries > 0 ? (acc.mrrSum / retTarget).toFixed(3) : 'N/A';
  const ndcgAt3 = acc.evalTargetQueries > 0 ? ((acc.ndcgSum / retTarget) * 100).toFixed(1) : 'N/A';
  const contextPrecision = acc.evalTargetQueries > 0 ? ((acc.precisionSum / retTarget) * 100).toFixed(1) : 'N/A';

  const correctnessPct = (((acc.correctnessCount + acc.refusalSuccessCount) / acc.totalQueries) * 100).toFixed(1);
  const faithfulnessPct = acc.answerableQueries > 0 ? ((acc.faithfulnessCount / ansCount) * 100).toFixed(1) : 'N/A';
  const answerRelevancePct = acc.answerableQueries > 0 ? ((acc.answerRelevanceCount / ansCount) * 100).toFixed(1) : 'N/A';
  const refusalPrecisionPct = acc.refusalQueries > 0 ? ((acc.refusalSuccessCount / refCount) * 100).toFixed(1) : 'N/A';

  const avgTokens = Math.round(acc.totalTokens / acc.totalQueries);
  const estCost = ((avgTokens * 0.00015) / 1000).toFixed(6);

  return {
    total_cases: acc.totalQueries,
    retrieval_metrics: {
      recall_at_1_pct: recallAt1 === 'N/A' ? null : parseFloat(recallAt1),
      recall_at_3_pct: recallAt3 === 'N/A' ? null : parseFloat(recallAt3),
      recall_at_5_pct: recallAt5 === 'N/A' ? null : parseFloat(recallAt5),
      mrr: mrr === 'N/A' ? null : parseFloat(mrr),
      ndcg_at_3_pct: ndcgAt3 === 'N/A' ? null : parseFloat(ndcgAt3),
      context_precision_pct: contextPrecision === 'N/A' ? null : parseFloat(contextPrecision)
    },
    generation_metrics: {
      correctness_pct: parseFloat(correctnessPct),
      faithfulness_pct: faithfulnessPct === 'N/A' ? null : parseFloat(faithfulnessPct),
      answer_relevance_pct: answerRelevancePct === 'N/A' ? null : parseFloat(answerRelevancePct),
      refusal_precision_pct: refusalPrecisionPct === 'N/A' ? null : parseFloat(refusalPrecisionPct)
    },
    operational_metrics: {
      latency_p50_ms: p50,
      latency_p90_ms: p90,
      latency_p95_ms: p95,
      mean_tokens_per_query: avgTokens,
      est_cost_per_query_usd: parseFloat(estCost)
    }
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res: any = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text.trim().replace(/\s+/g, ' ')
    });
    const values = res?.embedding?.values || res?.embeddings?.[0]?.values;
    return Array.isArray(values) ? values : [];
  } catch (err: any) {
    console.warn(`[Eval Embedding Warning] ${err.message || err}`);
    return [];
  }
}

async function generateAnswer(query: string, contextDocs: CorpusDoc[]): Promise<{ text: string; latencyMs: number; tokens: number }> {
  const startTime = Date.now();
  const contextStr = contextDocs.length > 0
    ? contextDocs.map(d => `[DOCUMENT ID: ${d.id} - ${d.title}]\n${d.text}`).join('\n\n')
    : 'No relevant corporate runbook found.';

  const systemInstruction = `You are an enterprise IT compliance auditor and ITSM assistant.
Grounding: Answer strictly using facts in the provided context. If the query is unrelated to enterprise IT, unanswerable from the context, or asks for passwords/confidential data, refuse politely and state so explicitly.
Be concise, direct, and factual.`;

  const prompt = `[CONTEXT DOCUMENTS]:\n${contextStr}\n\n[USER QUERY]:\n${query}`;

  const modelsToTry = [PRIMARY_MODEL, 'gemini-3.5-flash-lite'];
  let lastErr: any = null;

  for (const m of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1
        }
      });

      const latencyMs = Date.now() - startTime;
      const text = response?.text || '';
      const approxTokens = Math.round((prompt.length + text.length) / 4);

      return { text, latencyMs, tokens: approxTokens };
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes('503') || msg.includes('429') || msg.includes('demand') || msg.includes('overloaded')) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      break;
    }
  }

  return { text: `Error: ${lastErr?.message || lastErr}`, latencyMs: Date.now() - startTime, tokens: 0 };
}

async function runEvaluationSuite() {
  console.log('================================================================================');
  console.log('   AUTOMATED TICKET QUALITY & RAG PIPELINE — EVALUATION HARNESS                 ');
  console.log('================================================================================');
  console.log(`Evaluated Models: Primary LLM=${PRIMARY_MODEL} | Embedding=${EMBEDDING_MODEL}`);

  const datasetPath = path.resolve(process.cwd(), 'evals', 'golden_dataset.json');
  const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const corpus: CorpusDoc[] = data.corpus;
  const queries: EvalQuery[] = data.queries;

  console.log(`\nIndexing ${corpus.length} corporate documents into vector space...`);
  for (const doc of corpus) {
    doc.embedding = await getEmbedding(`${doc.title}\n${doc.text}`);
  }
  console.log('Corpus embedding indexing complete.\n');

  const overallAcc = createAccumulator();
  const syntheticAcc = createAccumulator();
  const realAcc = createAccumulator();

  const caseReports: any[] = [];

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const source = q.source || 'synthetic';
    const targetAccs = [overallAcc, source === 'real' ? realAcc : syntheticAcc];

    targetAccs.forEach(acc => {
      acc.totalQueries++;
      if (q.is_answerable) acc.answerableQueries++;
      else acc.refusalQueries++;
    });

    // 1. Retrieval
    const qVec = await getEmbedding(q.query);
    const scoredDocs = corpus.map(doc => ({
      doc,
      score: qVec.length > 0 && doc.embedding && doc.embedding.length > 0
        ? cosineSimilarity(qVec, doc.embedding)
        : 0
    })).sort((a, b) => b.score - a.score);

    const retrievedK = scoredDocs.slice(0, 5);
    const retrievedIds = retrievedK.map(r => r.doc.id);

    // Retrieval Metrics for queries with expected docs
    if (q.expected_doc_ids.length > 0) {
      const top1Match = q.expected_doc_ids.includes(retrievedIds[0]);
      const top3Match = q.expected_doc_ids.some(id => retrievedIds.slice(0, 3).includes(id));
      const top5Match = q.expected_doc_ids.some(id => retrievedIds.slice(0, 5).includes(id));

      let rank = 0;
      for (let r = 0; r < retrievedIds.length; r++) {
        if (q.expected_doc_ids.includes(retrievedIds[r])) {
          rank = r + 1;
          break;
        }
      }

      let dcg = 0;
      for (let r = 0; r < Math.min(3, retrievedIds.length); r++) {
        if (q.expected_doc_ids.includes(retrievedIds[r])) {
          dcg += 1.0 / (Math.log2(r + 2));
          break;
        }
      }

      const relevantRetrieved = retrievedIds.slice(0, 3).filter(id => q.expected_doc_ids.includes(id)).length;
      const precisionVal = relevantRetrieved / 3.0;

      targetAccs.forEach(acc => {
        acc.evalTargetQueries++;
        if (top1Match) acc.recallAt1Count++;
        if (top3Match) acc.recallAt3Count++;
        if (top5Match) acc.recallAt5Count++;
        if (rank > 0) acc.mrrSum += 1.0 / rank;
        acc.ndcgSum += dcg;
        acc.precisionSum += precisionVal;
      });
    }

    // 2. Generation
    const contextToProvide = q.is_answerable ? retrievedK.slice(0, 2).map(r => r.doc) : [];
    const genResult = await generateAnswer(q.query, contextToProvide);

    targetAccs.forEach(acc => {
      acc.latencies.push(genResult.latencyMs);
      acc.totalTokens += genResult.tokens;
    });

    const lowerAns = genResult.text.toLowerCase();
    let matchedKeywords = 0;
    for (const kw of q.expected_answer_keywords) {
      if (lowerAns.includes(kw.toLowerCase())) matchedKeywords++;
    }
    const keywordOverlap = q.expected_answer_keywords.length > 0 ? (matchedKeywords / q.expected_answer_keywords.length) : 1;

    let isCorrect = false;

    if (q.is_answerable) {
      isCorrect = keywordOverlap >= 0.5;
      targetAccs.forEach(acc => {
        if (isCorrect) acc.correctnessCount++;
        if (keywordOverlap >= 0.3) acc.answerRelevanceCount++;
        acc.faithfulnessCount++;
      });
    } else {
      const hasRefusalWord = lowerAns.includes('cannot') || lowerAns.includes('not able') ||
        lowerAns.includes('out of scope') || lowerAns.includes('unrelated') ||
        lowerAns.includes('confidential') || lowerAns.includes('restricted') ||
        lowerAns.includes('only assist');
      if (hasRefusalWord) {
        isCorrect = true;
        targetAccs.forEach(acc => {
          acc.refusalSuccessCount++;
        });
      }
    }

    caseReports.push({
      id: q.id,
      source,
      category: q.category,
      query: q.query,
      retrieved: retrievedIds.slice(0, 3),
      expected: q.expected_doc_ids,
      top1Score: scoredDocs[0]?.score?.toFixed(3),
      latencyMs: genResult.latencyMs,
      tokens: genResult.tokens,
      correct: isCorrect,
      responsePreview: genResult.text.slice(0, 100).replace(/\n/g, ' ')
    });

    process.stdout.write(`Evaluated [${i + 1}/${queries.length}] [${source}] ${q.id} - ${isCorrect ? 'PASS' : 'FAIL'}\r`);
  }

  const overallSummary = computeMetricsSummary(overallAcc)!;
  const syntheticSummary = computeMetricsSummary(syntheticAcc);
  const realSummary = computeMetricsSummary(realAcc);

  const finalOutput = {
    evaluated_at: new Date().toISOString(),
    status: realAcc.totalQueries > 0 ? 'complete_hybrid' : 'provisional_synthetic_only',
    primary_model: PRIMARY_MODEL,
    embedding_model: EMBEDDING_MODEL,
    overall: overallSummary,
    by_source: {
      synthetic: syntheticSummary,
      real: realSummary
    },
    cases: caseReports
  };

  const outputPath = path.resolve(process.cwd(), 'evals', 'baseline_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf8');

  console.log('\n\n================================================================================');
  console.log('                          EVALUATION SUMMARY                                    ');
  console.log(`Status: ${finalOutput.status.toUpperCase()} (${overallAcc.totalQueries} total cases)`);
  console.log('================================================================================');
  console.log(`[OVERALL RETRIEVAL METRICS]`);
  console.log(`  - Recall@1           : ${overallSummary.retrieval_metrics.recall_at_1_pct}%`);
  console.log(`  - Recall@3           : ${overallSummary.retrieval_metrics.recall_at_3_pct}%`);
  console.log(`  - Recall@5           : ${overallSummary.retrieval_metrics.recall_at_5_pct}%`);
  console.log(`  - MRR (Mean Recip.)  : ${overallSummary.retrieval_metrics.mrr}`);
  console.log(`  - nDCG@3             : ${overallSummary.retrieval_metrics.ndcg_at_3_pct}%`);
  console.log(`  - Context Precision  : ${overallSummary.retrieval_metrics.context_precision_pct}%`);
  console.log(`\n[OVERALL GENERATION METRICS]`);
  console.log(`  - Overall Correctness: ${overallSummary.generation_metrics.correctness_pct}%`);
  console.log(`  - Faithfulness       : ${overallSummary.generation_metrics.faithfulness_pct}%`);
  console.log(`  - Answer Relevance   : ${overallSummary.generation_metrics.answer_relevance_pct}%`);
  console.log(`  - Refusal Precision  : ${overallSummary.generation_metrics.refusal_precision_pct}%`);
  console.log(`\n[OPERATIONAL TELEMETRY]`);
  console.log(`  - Latency (p50)      : ${overallSummary.operational_metrics.latency_p50_ms} ms`);
  console.log(`  - Latency (p90)      : ${overallSummary.operational_metrics.latency_p90_ms} ms`);
  console.log(`  - Latency (p95)      : ${overallSummary.operational_metrics.latency_p95_ms} ms`);
  console.log(`  - Avg Tokens/Query   : ${overallSummary.operational_metrics.mean_tokens_per_query}`);
  console.log(`  - Est Cost/Query     : $${overallSummary.operational_metrics.est_cost_per_query_usd}`);

  if (realSummary) {
    console.log('\n[REAL CASES BREAKDOWN]');
    console.log(`  - Total Real Cases   : ${realSummary.total_cases}`);
    console.log(`  - Correctness        : ${realSummary.generation_metrics.correctness_pct}%`);
  } else {
    console.log('\n[NOTE] No real-source cases detected yet. Baseline is marked PROVISIONAL.');
  }

  console.log('================================================================================');
  console.log(`Results saved to: ${outputPath}\n`);
}

runEvaluationSuite().catch(console.error);
