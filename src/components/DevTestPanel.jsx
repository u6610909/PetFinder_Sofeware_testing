import React from "react";
import { breedScore, colorScore, distanceScoreKm, timeScoreHours, sizeScore, ageScore } from "../utils/scoring";
import { baseRadiusByHours } from "../utils/searchZone";
import { uid } from "../utils/datastore";

export default function DevTestPanel() {
  const tests = [
    { name: "breedScore exact match", run: () => breedScore("golden_retriever", "golden_retriever"), expect: 100 },
    { name: "breedScore similar (golden vs labrador)", run: () => breedScore("golden_retriever", "labrador_retriever"), expect: 80 },
    { name: "breedScore fallback unrelated -> 25", run: () => breedScore("pomeranian", "siamese"), expect: 25 },
    { name: "colorScore exact", run: () => colorScore("black", "black"), expect: 100 },
    { name: "colorScore partial token overlap", run: () => colorScore("gray white", "gray"), expect: 50 },
    { name: "colorScore no overlap -> 0", run: () => colorScore("gold", "black"), expect: 0 },
    { name: "distanceScore 0km -> 100", run: () => distanceScoreKm(0), expect: 100 },
    { name: "distanceScore 15km -> 0", run: () => distanceScoreKm(15), expect: 0 },
    { name: "timeScore 0h -> 100", run: () => timeScoreHours(0), expect: 100 },
    { name: "timeScore 72h -> 0", run: () => timeScoreHours(72), expect: 0 },
    { name: "sizeScore exact", run: () => sizeScore("small", "small"), expect: 100 },
    { name: "sizeScore different", run: () => sizeScore("small", "large"), expect: 0 },
    { name: "ageScore exact", run: () => ageScore("adult", "adult"), expect: 100 },
    { name: "ageScore different", run: () => ageScore("puppy", "adult"), expect: 0 },
    { name: "uid() has prefix", run: () => uid("LP").startsWith("LP"), expect: true },
    { name: "baseRadius <6h -> 2", run: () => baseRadiusByHours(5), expect: 2 },
    { name: "baseRadius 30h -> 10", run: () => baseRadiusByHours(30), expect: 10 },
  ];

  const results = tests.map((t) => {
    const got = t.run();
    const pass = Object.is(got, t.expect);
    return { name: t.name, expect: t.expect, got, pass };
  });
  const allPass = results.every((r) => r.pass);

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-3">Dev • Unit-like Tests</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Test</th><th className="py-2 pr-4">Expected</th><th className="py-2 pr-4">Got</th><th className="py-2 pr-4">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 pr-4">{r.name}</td>
              <td className="py-2 pr-4">{String(r.expect)}</td>
              <td className="py-2 pr-4">{String(r.got)}</td>
              <td className={`py-2 pr-4 font-semibold ${r.pass ? "text-green-600" : "text-red-600"}`}>{r.pass ? "PASS" : "FAIL"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`mt-4 text-sm font-semibold ${allPass ? "text-green-700" : "text-red-700"}`}>Summary: {allPass ? "ALL PASS" : "SOME TESTS FAILED"}</div>
    </div>
  );
}