import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { BLOSSOM_SERVER } from "@/lib/blossom";

export function useUploadFile() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      const uploader = new BlossomUploader({
        servers: [BLOSSOM_SERVER],
        signer: user.signer,
      });

      const tags = await uploader.upload(file);
      return tags;
    },
  });
}