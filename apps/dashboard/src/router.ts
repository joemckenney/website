// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/`
  | `/bases`
  | `/bases/:baseId`
  | `/chat/:id`
  | `/history`
  | `/login`
  | `/new`
  | `/settings`
  | `/tables`
  | `/tables/:tableId`

export type Params = {
  '/bases/:baseId': { baseId: string }
  '/chat/:id': { id: string }
  '/tables/:tableId': { tableId: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
