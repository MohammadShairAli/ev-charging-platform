import { CostComparisonResults } from "@/src/components/cost/CostComparisonCalculator";
import { parseCostInputs } from "@/src/components/cost/costComparisonUtils";

type CostComparisonResultsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CostComparisonResultsPage({ searchParams }: CostComparisonResultsPageProps) {
  const inputs = parseCostInputs(await searchParams);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <CostComparisonResults inputs={inputs} />
    </main>
  );
}
