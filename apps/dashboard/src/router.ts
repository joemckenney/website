// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/`
  | `/agents`
  | `/bases`
  | `/bases/:baseId`
  | `/bases/:baseId/:tableId`
  | `/chat/:id`
  | `/history`
  | `/login`
  | `/new`
  | `/settings`
  | `/tables`
  | `/tables/:tableId`

export type Params = {
  '/bases/:baseId': { baseId: string }
  '/bases/:baseId/:tableId': { baseId: string; tableId: string }
  '/chat/:id': { id: string }
  '/tables/:tableId': { tableId: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
