import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function extractStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/profile-images/";
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }
  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPG, WEBP, or GIF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image must be smaller than 5MB" },
        { status: 400 },
      );
    }

    const fileExt = file.name.split(".").pop() || "png";
    const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await serviceSupabase.storage
      .from("profile-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = serviceSupabase.storage.from("profile-images").getPublicUrl(filePath);

    const mergedMetadata = {
      ...(user.user_metadata || {}),
      avatar_url: publicUrl,
    };

    const { error: updateError } =
      await serviceSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: mergedMetadata,
      });

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update profile metadata: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ avatarUrl: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("[ProfileAvatar] Upload failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload profile image",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentAvatarUrl = user.user_metadata?.avatar_url as string | undefined;
    if (currentAvatarUrl) {
      const storagePath = extractStoragePathFromPublicUrl(currentAvatarUrl);
      if (storagePath) {
        await serviceSupabase.storage.from("profile-images").remove([storagePath]);
      }
    }

    const mergedMetadata = {
      ...(user.user_metadata || {}),
      avatar_url: null,
    };

    const { error: updateError } =
      await serviceSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: mergedMetadata,
      });

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to remove profile image: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[ProfileAvatar] Remove failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove profile image",
      },
      { status: 500 },
    );
  }
}
