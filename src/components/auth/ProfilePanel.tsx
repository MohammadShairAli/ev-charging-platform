"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/src/components/auth/LogoutButton";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { SavedCarsEditor } from "@/src/components/vehicle/SavedCarsEditor";
import { AUTH_STORAGE_KEY, ROUTES } from "@/src/lib/constants";
import {
  normalizeStoredCars,
  PROFILE_STORAGE_KEY,
  type StoredCar,
  type StoredProfile,
} from "@/src/lib/local-storage";

type StoredAuth = {
  mode?: "guest" | "auth";
  session?: {
    user?: {
      email?: string;
      user_metadata?: {
        first_name?: string;
        last_name?: string;
        full_name?: string;
        phone?: string;
        avatar_data_url?: string;
        cars?: StoredCar[];
      };
    };
    access_token?: string;
  };
};

export function ProfilePanel() {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [editing, setEditing] = useState<"profile" | "cars" | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const storedAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null") as StoredAuth | null;
        setAuth(storedAuth);
        if (new URLSearchParams(window.location.search).get("edit") === "cars") {
          setEditing("cars");
        }

        if (storedAuth?.mode === "auth" && storedAuth.session?.access_token && !storedAuth.session.user) {
          void refreshStoredUser(storedAuth).then(setAuth);
        }
      } catch {
        setAuth(null);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const metadata = auth?.session?.user?.user_metadata;
  const name = metadata?.full_name || [metadata?.first_name, metadata?.last_name].filter(Boolean).join(" ");
  const email = auth?.session?.user?.email;
  const avatar = metadata?.avatar_data_url;
  const initial = (metadata?.first_name || name || email || "U").trim().charAt(0).toUpperCase() || "U";

  function finishEditing() {
    setEditing(null);
    window.history.replaceState(null, "", ROUTES.profile);
  }

  if (auth?.mode === "guest") {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-border bg-background">
            <AppIcon name="person_add" className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Guest mode</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">You are not signed in</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Sign in or create an account to save your profile and use account features.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <Link
            href={ROUTES.login}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover"
          >
            Sign in
          </Link>
          <Link
            href={ROUTES.signup}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:border-border hover:text-primary"
          >
            Sign up
          </Link>
        </div>

        <div className="mt-3">
          <LogoutButton label="Exit guest mode" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-primary" aria-hidden="true">{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Signed in</p>
          <h2 className="mt-1 truncate text-xl font-bold text-foreground">{name || email || "Account user"}</h2>
          {email ? <p className="mt-1 truncate text-sm text-muted">{email}</p> : null}
        </div>
      </div>

      {auth ? (
        <div className="mt-5 grid gap-4">
          {editing === "profile" ? (
          <EditableProfileForm
            auth={auth}
            onSaved={(nextAuth) => {
              setAuth(nextAuth);
              finishEditing();
            }}
          />
          ) : (
            <ReadOnlyProfileDetails auth={auth} onEdit={() => setEditing("profile")} />
          )}

          {editing === "cars" ? (
            <EditableCarsForm
              auth={auth}
              onSaved={(nextAuth) => {
                setAuth(nextAuth);
                finishEditing();
              }}
            />
          ) : (
            <SavedCarsSummary
              cars={normalizeStoredCars(auth.session?.user?.user_metadata?.cars)}
              onEdit={() => setEditing("cars")}
            />
          )}
        </div>
      ) : null}

      <div className="mt-5 border-t border-border pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}

async function refreshStoredUser(auth: StoredAuth) {
  const token = auth.session?.access_token;

  if (!token) {
    return auth;
  }

  const response = await fetch("/api/auth/session", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  if (!response.ok) {
    return auth;
  }

  const nextAuth = {
    ...auth,
    session: {
      ...auth.session,
      user: data.user,
    },
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));

  return nextAuth;
}

function ReadOnlyProfileDetails({ auth, onEdit }: { auth: StoredAuth; onEdit: () => void }) {
  const [collapsed, setCollapsed] = useState(true);
  const metadata = auth.session?.user?.user_metadata;
  const firstName = metadata?.first_name || "-";
  const lastName = metadata?.last_name || "-";
  const phone = metadata?.phone || "-";
  const email = auth.session?.user?.email || "-";

  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className={`${collapsed ? "" : "mb-4"} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <AppIcon name="manage_accounts" className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Profile settings</h3>
        </div>
        <CollapseButton
          collapsed={collapsed}
          onToggle={() => {
            if (collapsed) {
              onEdit();
            } else {
              setCollapsed(true);
            }
          }}
          label="profile settings"
        />
      </div>

      <dl className={collapsed ? "hidden" : "grid gap-3 sm:grid-cols-2"}>
        <ProfileDetail label="First name" value={firstName} />
        <ProfileDetail label="Last name" value={lastName} />
        <ProfileDetail label="Phone number" value={phone} />
        <ProfileDetail label="Email" value={email} />
      </dl>
    </section>
  );
}

function SavedCarsSummary({ cars, onEdit }: { cars: StoredCar[]; onEdit: () => void }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className={`${collapsed ? "" : "mb-4"} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <AppIcon name="electric_car" className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Your cars</h3>
        </div>
        <CollapseButton
          collapsed={collapsed}
          onToggle={() => {
            if (collapsed) {
              onEdit();
            } else {
              setCollapsed(true);
            }
          }}
          label="cars"
        />
      </div>
      {!collapsed && cars.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {cars.map((car) => (
            <li key={car.id} className="rounded-lg border border-border bg-background px-3 py-3">
              <p className="truncate text-sm font-bold text-foreground">
                {[car.make, car.model, car.variant].filter(Boolean).join(" ")}
              </p>
              <p className="mt-1 text-xs text-muted">{car.kind} · {car.rangeKm} km</p>
            </li>
          ))}
        </ul>
      ) : !collapsed ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted">No cars saved.</p>
      ) : null}
    </section>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}

function EditableProfileForm({
  auth,
  onSaved,
}: {
  auth: StoredAuth;
  onSaved: (auth: StoredAuth) => void;
}) {
  const metadata = auth.session?.user?.user_metadata;
  const [firstName, setFirstName] = useState(metadata?.first_name || "");
  const [lastName, setLastName] = useState(metadata?.last_name || "");
  const [phone, setPhone] = useState(metadata?.phone || "");
  const [email, setEmail] = useState(auth.session?.user?.email || "");
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const currentAvatar = metadata?.avatar_data_url || "";
  const avatarPreview = image || currentAvatar;
  const previewInitial = (firstName || metadata?.full_name || email || "U").trim().charAt(0).toUpperCase() || "U";
  const hasChanges = firstName !== (metadata?.first_name || "")
    || lastName !== (metadata?.last_name || "")
    || phone !== (metadata?.phone || "")
    || email !== (auth.session?.user?.email || "")
    || image !== null;

  async function handleImage(file?: File) {
    if (!file) {
      setImage(null);
      setImageName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(typeof reader.result === "string" ? reader.result : null);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChanges) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const token = auth.session?.access_token;

      if (!token) {
        throw new Error("Please login again before editing your profile.");
      }

      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email,
          image,
          cars: normalizeStoredCars(metadata?.cars),
          currentEmail: auth.session?.user?.email,
          redirectTo: `${window.location.origin}${ROUTES.authVerify}`,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Profile update failed.");
      }

      const nextAuth: StoredAuth = {
        ...auth,
        session: {
          ...auth.session,
          user: {
            ...auth.session?.user,
            user_metadata: {
              ...auth.session?.user?.user_metadata,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
              phone,
              ...(data.user?.user_metadata?.avatar_data_url
                ? { avatar_data_url: data.user.user_metadata.avatar_data_url }
                : {}),
            },
          },
        },
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
      setMessage(data.message || "Profile saved.");
      onSaved(nextAuth);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Profile update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-lg border border-border bg-background p-4" onSubmit={saveProfile}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 ">
          <AppIcon  name="manage_accounts" className="h-5 w-5 text-primary cursor-pointer" />
          <h3 className="text-lg font-bold text-foreground">Edit profile settings</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && !collapsed ? (
            <button
              type="submit"
              disabled={saving}
              className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          ) : null}
          <CollapseButton collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} label="profile editor" />
        </div>
      </div>
      <fieldset className={collapsed ? "hidden" : "grid gap-4"} disabled={saving}>
      <div className="grid gap-3 sm:grid-cols-2">
        <ProfileField label="First name" value={firstName} onChange={setFirstName} required />
        <ProfileField label="Last name" value={lastName} onChange={setLastName} required />
      </div>
      <ProfileField label="Phone number" value={phone} onChange={setPhone} type="tel" required />
      <ProfileField label="Email" value={email} onChange={setEmail} type="email" required />
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary" aria-hidden="true">{previewInitial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Profile image</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Choose a square photo for the clearest profile circle. New images are uploaded to Cloudinary when you save.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label
                htmlFor="profile-image"
                className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover"
              >
                <AppIcon name="photo_camera" className="h-[1.15rem] w-[1.15rem]" />
                Choose image
              </label>
              {image ? (
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImageName("");
                  }}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:border-border hover:text-primary"
                >
                  <AppIcon name="close" className="h-[1.15rem] w-[1.15rem]" />
                  Remove selection
                </button>
              ) : null}
            </div>
            <p className="mt-2 truncate text-xs text-muted">
              {imageName ? `Selected: ${imageName}` : currentAvatar ? "Current profile image is saved." : "No image selected."}
            </p>
          </div>
        </div>
        <input
          id="profile-image"
          type="file"
          accept="image/*"
          onChange={(event) => void handleImage(event.target.files?.[0])}
          className="sr-only"
        />
      </div>
      <p className="text-xs leading-5 text-muted">Changing email sends a verification link to the new address before it becomes active.</p>

      {message ? <p className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">{message}</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">{error}</p> : null}

      </fieldset>
    </form>
  );
}

function EditableCarsForm({
  auth,
  onSaved,
}: {
  auth: StoredAuth;
  onSaved: (auth: StoredAuth) => void;
}) {
  const initialCars = normalizeStoredCars(auth.session?.user?.user_metadata?.cars);
  const [cars, setCars] = useState<StoredCar[]>(initialCars);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const hasChanges = JSON.stringify(cars) !== JSON.stringify(initialCars);

  async function saveCars(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChanges) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const token = auth.session?.access_token;

      if (!token) {
        throw new Error("Please login again before editing your cars.");
      }

      const response = await fetch("/api/auth/cars", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cars }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Cars could not be saved.");
      }

      const nextAuth: StoredAuth = {
        ...auth,
        session: {
          ...auth.session,
          user: {
            ...auth.session?.user,
            ...data.user,
            user_metadata: {
              ...auth.session?.user?.user_metadata,
              ...data.user?.user_metadata,
              cars,
            },
          },
        },
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
      persistProfileCars(cars);
      setMessage("Cars saved.");
      onSaved(nextAuth);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Cars could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-lg border border-border bg-background p-4" onSubmit={saveCars}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AppIcon name="electric_car" className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Edit your cars</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && !collapsed ? (
            <button
              type="submit"
              disabled={saving}
              className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          ) : null}
          <CollapseButton collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} label="car editor" />
        </div>
      </div>

      <fieldset className={collapsed ? "hidden" : "grid gap-4"} disabled={saving}>
      <SavedCarsEditor cars={cars} onChange={setCars} />

      {message ? <p className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground">{message}</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground">{error}</p> : null}

      </fieldset>
    </form>
  );
}

function persistProfileCars(cars: StoredCar[]) {
  let profile: StoredProfile = {};

  try {
    profile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "{}") as StoredProfile;
  } catch {
    profile = {};
  }

  const firstCar = cars[0];
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
    ...profile,
    cars,
    car: firstCar
      ? {
          make: firstCar.make,
          model: firstCar.model,
          variant: firstCar.variant,
          kind: firstCar.kind,
          rangeKm: firstCar.rangeKm,
        }
      : undefined,
  }));
}

function CollapseButton({
  collapsed,
  onToggle,
  label,
}: {
  collapsed: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${collapsed ? "Expand" : "Minimize"} ${label}`}
      aria-expanded={!collapsed}
      className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-primary transition hover:border-border"
    >
      <span className="text-2xl font-medium leading-none" aria-hidden="true">
        {collapsed ? "+" : "−"}
      </span>
    </button>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-foreground"
      />
    </div>
  );
}
