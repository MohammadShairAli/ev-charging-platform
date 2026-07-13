import { CostComparisonResults } from "@/src/components/cost/CostComparisonCalculator";
import { parseCostInputs } from "@/src/components/cost/costComparisonUtils";
import { requireSessionAccess } from "@/src/lib/auth-guard";

type CostComparisonResultsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CostComparisonResultsPage({ searchParams }: CostComparisonResultsPageProps) {
  await requireSessionAccess();
  const inputs = parseCostInputs(await searchParams);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <CostComparisonResults inputs={inputs} />
    </main>
  );
}
