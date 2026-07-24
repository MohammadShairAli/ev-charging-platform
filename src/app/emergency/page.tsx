import { ButtonLink } from "@/src/components/ui/ButtonLink";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { EMERGENCY_CONTACTS, ROUTES } from "@/src/lib/constants";

const immediateSteps = [
  {
    icon: "campaign",
    title: "Make yourself visible",
    description: "Move off the road if the vehicle can be driven safely, apply the parking brake, and switch on the hazard lights.",
  },
  {
    icon: "groups",
    title: "Move people to safety",
    description: "Exit away from moving traffic and wait behind a barrier or well clear of the road whenever possible.",
  },
  {
    icon: "emergency",
    title: "Treat smoke or heat as an emergency",
    description: "Move well away, keep others back, and call Rescue 1122. Tell them clearly that an electric vehicle is involved.",
  },
  {
    icon: "shield",
    title: "Do not touch damaged high-voltage parts",
    description: "Do not open the battery, touch exposed orange cables, or restart a badly damaged or flooded vehicle.",
  },
] as const;

const detailsToShare = [
  "Your exact location, nearby landmark, or motorway kilometre marker",
  "Vehicle make, model, colour, and registration number",
  "Whether there was a crash, smoke, fire, flooding, or a complete loss of power",
  "How many people are present and whether anyone is injured",
] as const;

export default function EmergencyPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
              <AppIcon name="emergency" className="h-4 w-4" />
              EV emergency help
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Get safe first. Then call for help.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              If there is a collision, injury, smoke, fire, unusual heat, or immediate danger, move away from the vehicle and contact emergency services now.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="tel:1122"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 sm:w-auto"
              >
                <AppIcon name="emergency" className="h-5 w-5" />
                Call Rescue 1122
              </a>
              <a
                href="tel:130"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:border-border hover:text-primary sm:w-auto"
              >
                <AppIcon name="directions_car" className="h-5 w-5" />
                Call Motorway Police 130
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-600 text-white">
                <AppIcon name="electric_bolt" className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-red-950">Battery warning signs</h2>
                <p className="mt-2 text-sm leading-6 text-red-900">
                  Smoke, popping or hissing sounds, sparks, a strong unusual smell, or rapidly increasing heat can indicate a serious battery problem.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-surface/80 p-4 text-sm font-semibold leading-6 text-red-950">
              Do not approach the vehicle again to collect belongings. Keep people away and wait for trained responders.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Immediate precautions</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">What to do at the roadside</h2>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            Follow these steps only when it is safe to do so. Your safety and the safety of passengers comes before the vehicle.
          </p>
        </div>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2">
          {immediateSteps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-background text-primary">
                  <AppIcon name={step.icon} className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-secondary">
                    {index + 1}
                  </span>
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Emergency contacts</p>
              <h2 className="mt-2 text-3xl font-bold text-foreground">Tap a number to call</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-muted">
              Use emergency services for immediate danger. Use roadside support for a safe breakdown without injuries, smoke, or fire.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EMERGENCY_CONTACTS.map((contact) => (
              <a
                key={contact.number}
                href={`tel:${contact.number}`}
                className="group flex min-h-44 flex-col rounded-2xl border border-border bg-background p-5 transition hover:-translate-y-1 hover:border-border hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-secondary">
                    <AppIcon name="emergency" className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-surface-strong px-3 py-1.5 text-lg font-bold text-primary">
                    {contact.number}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-bold text-foreground">{contact.label}</h3>
                <p className="mt-2 text-sm leading-5 text-muted">{contact.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_0.82fr] lg:px-8">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-background text-primary">
              <AppIcon name="check" className="h-6 w-6" />
            </span>
            <h2 className="text-xl font-bold text-foreground">Information to share when calling</h2>
          </div>
          <ul className="mt-5 space-y-3">
            {detailsToShare.map((detail) => (
              <li key={detail} className="flex gap-3 text-sm leading-6 text-muted">
                <AppIcon name="check" className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-primary p-5 text-secondary sm:p-7">
          <AppIcon name="ev_station" className="h-8 w-8" />
          <h2 className="mt-5 text-2xl font-bold">Safe, but running low?</h2>
          <p className="mt-3 text-sm leading-6 text-secondary/80">
            The live closest-station map now appears on the home page. You can also open the complete station finder or build a range-aware route.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={ROUTES.home} variant="secondary" className="border-secondary/40 bg-surface text-primary hover:border-secondary">
              See closest station
            </ButtonLink>
            <ButtonLink href={ROUTES.planTrip} variant="secondary" className="border-secondary/40 bg-transparent text-secondary hover:border-secondary hover:text-secondary">
              Plan a safe route
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
