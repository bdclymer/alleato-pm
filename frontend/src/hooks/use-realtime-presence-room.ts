"use client";

import { createClient } from "@/lib/supabase/client";
import { REALTIME_SUBSCRIBE_STATES, type User } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

const supabase = createClient();

export type RealtimeUser = {
  id: string;
  userId: string | null;
  name: string;
  image: string;
  isCurrentUser: boolean;
};

type UserMetadata = {
  full_name?: string;
  name?: string;
  avatar_url?: string;
};

type CurrentPresenceUser = {
  userId: string | null;
  presenceKey: string;
  name: string;
  image: string | null;
};

type PresenceStatePayload = {
  userId?: string | null;
  name?: string | null;
  image?: string | null;
};

function getDisplayName(user: User | null) {
  if (!user) return "Unknown user";

  const metadata = (user.user_metadata ?? {}) as UserMetadata;
  return (
    metadata.full_name?.trim() ||
    metadata.name?.trim() ||
    user.email?.split("@")[0] ||
    "Unknown user"
  );
}

function getAvatarUrl(user: User | null) {
  const metadata = (user?.user_metadata ?? {}) as UserMetadata;
  return metadata.avatar_url?.trim() || null;
}

export const useRealtimePresenceRoom = (roomName: string) => {
  const anonymousPresenceKey = useRef<string | null>(null);
  if (!anonymousPresenceKey.current) {
    anonymousPresenceKey.current = `anonymous-${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
  }
  const [currentUser, setCurrentUser] = useState<CurrentPresenceUser | null>(
    null,
  );
  const [users, setUsers] = useState<Record<string, RealtimeUser>>({});

  useEffect(() => {
    let cancelled = false;

    const resolveCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      const authUser = data.session?.user ?? null;

      if (cancelled) return;

      const presenceKey = anonymousPresenceKey.current;
      if (!presenceKey) return;

      setCurrentUser({
        userId: authUser?.id ?? null,
        presenceKey: authUser?.id ?? presenceKey,
        name: getDisplayName(authUser),
        image: getAvatarUrl(authUser),
      });
    };

    resolveCurrentUser();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      const presenceKey = anonymousPresenceKey.current;
      if (!presenceKey) return;

      setCurrentUser({
        userId: authUser?.id ?? null,
        presenceKey: authUser?.id ?? presenceKey,
        name: getDisplayName(authUser),
        image: getAvatarUrl(authUser),
      });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUsers({});
      return;
    }

    const room = supabase.channel(roomName, {
      config: {
        presence: {
          key: currentUser.presenceKey,
        },
      },
    });

    room
      .on("presence", { event: "sync" }, () => {
        const newState = room.presenceState<PresenceStatePayload>();

        const entries: Array<[string, RealtimeUser]> = Object.entries(
          newState,
        ).flatMap(([key, values]) => {
          const presence = values[0];
          if (!presence) {
            return [];
          }

          const userId = presence.userId ?? null;
          const isCurrentUser =
            key === currentUser.presenceKey ||
            (!!currentUser.userId && userId === currentUser.userId);

          if (isCurrentUser) {
            return [];
          }

          return [
            [
              key,
              {
                id: key,
                userId,
                name: presence.name?.trim() || "Unknown user",
                image: presence.image?.trim() || "",
                isCurrentUser,
              },
            ],
          ];
        });

        const newUsers = Object.fromEntries(entries);
        setUsers(newUsers);
      })
      .subscribe(async (status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          await room.track({
            userId: currentUser.userId,
            name: currentUser.name,
            image: currentUser.image,
          });
        } else {
          setUsers({});
        }
      });

    return () => {
      room.unsubscribe();
    };
  }, [roomName, currentUser]);

  return { users };
};
