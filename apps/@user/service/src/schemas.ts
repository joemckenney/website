import { Type } from "typebox";

export const UserSchema = Type.Object({
  id: Type.String({ format: "uuid", description: "User ID" }),
  email: Type.String({ format: "email", description: "User email" }),
  name: Type.Union([Type.String(), Type.Null()], {
    description: "User name",
  }),
  createdAt: Type.String({ format: "date-time", description: "Created at" }),
  updatedAt: Type.String({ format: "date-time", description: "Updated at" }),
  metadata: Type.Any({ description: "Additional user metadata" }),
});

export const CreateUserSchema = Type.Object({
  email: Type.String({ format: "email", description: "User email" }),
  name: Type.Optional(Type.String({ description: "User name" })),
  metadata: Type.Optional(Type.Any({ description: "User metadata" })),
});

export const UpdateUserSchema = Type.Object({
  name: Type.Optional(Type.String({ description: "User name" })),
  metadata: Type.Optional(Type.Any({ description: "User metadata" })),
});

export const ErrorResponse = Type.Object({
  error: Type.String({ description: "Error message" }),
  message: Type.Optional(Type.String({ description: "Detailed message" })),
});
