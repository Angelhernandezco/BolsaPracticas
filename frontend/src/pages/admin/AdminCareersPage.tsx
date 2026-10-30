import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Plus, Search } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  QueryError,
  Select,
  Title,
} from '../../components/ui'
import CareerForm from '../../components/CareerForm'
import { api, getErrorMessage } from '../../services/api'
import type { CareerDto } from '../../types'

export default function AdminCareersPage() {
  const [careers, setCareers] = useState<CareerDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<CareerDto | null | undefined>()
  const [deactivating, setDeactivating] = useState<CareerDto | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setCareers(await api.listCareers())
    } catch (error) {
      setLoadError(getErrorMessage(error, 'No pudimos cargar las carreras.'))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function save(name: string) {
    setBusy(true)
    setMutationError('')
    try {
      const updated = editing
        ? await api.updateCareer(editing.id, { name })
        : await api.createCareer(name)
      setCareers((current) =>
        editing
          ? current.map((career) =>
              career.id === updated.id ? updated : career,
            )
          : [...current, updated],
      )
      setEditing(undefined)
    } catch (error) {
      setMutationError(getErrorMessage(error, 'No pudimos guardar la carrera.'))
    } finally {
      setBusy(false)
    }
  }
  async function changeStatus(career: CareerDto, active: boolean) {
    setBusy(true)
    setMutationError('')
    try {
      const updated = await api.updateCareer(career.id, { active })
      setCareers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setDeactivating(null)
    } catch (error) {
      setMutationError(
        getErrorMessage(error, 'No pudimos actualizar la carrera.'),
      )
    } finally {
      setBusy(false)
    }
  }
  const filtered = careers.filter(
    (career) =>
      career.name
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (!status || String(career.active) === status),
  )

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">Administración</span>
          <Title>Carreras</Title>
          <p>
            Administra las carreras disponibles y conserva sus asociaciones al
            desactivarlas.
          </p>
        </div>
        <Button
          onClick={() => {
            setMutationError('')
            setEditing(null)
          }}
        >
          <Plus /> Nueva carrera
        </Button>
      </div>
      {mutationError && editing === undefined && !deactivating && (
        <div className="notice warning">{mutationError}</div>
      )}
      <Card className="filter-bar">
        <Field label="Buscar carrera">
          <div className="input-with-icon">
            <Search />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre de la carrera"
            />
          </div>
        </Field>
        <Field label="Estado">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </Select>
        </Field>
      </Card>
      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <QueryError message={loadError} onRetry={() => void load()} />
      ) : !filtered.length ? (
        <EmptyState
          icon={<GraduationCap />}
          title={
            careers.length
              ? 'No encontramos coincidencias'
              : 'No hay carreras registradas'
          }
          text="Crea una carrera o ajusta los filtros para consultar el catálogo."
        />
      ) : (
        <Card className="table-card">
          <div className="data-table careers-table">
            <div className="table-row table-head">
              <span>Nombre</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {filtered.map((career) => (
              <div className="table-row career-row" key={career.id}>
                <strong>{career.name}</strong>
                <span>
                  <Badge tone={career.active ? 'success' : 'neutral'}>
                    {career.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </span>
                <div className="career-actions">
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setMutationError('')
                      setEditing(career)
                    }}
                  >
                    Editar nombre
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setMutationError('')
                      if (career.active) setDeactivating(career)
                      else void changeStatus(career, true)
                    }}
                  >
                    {career.active ? 'Desactivar' : 'Reactivar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Modal
        open={editing !== undefined}
        title={editing ? 'Editar carrera' : 'Nueva carrera'}
        busy={busy}
        onClose={() => setEditing(undefined)}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setEditing(undefined)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="career-form" loading={busy}>
              {editing ? 'Guardar cambios' : 'Crear carrera'}
            </Button>
          </>
        }
      >
        <CareerForm
          key={editing?.id || 'new'}
          initialName={editing?.name}
          disabled={busy}
          error={mutationError}
          onSubmit={save}
        />
      </Modal>
      <Modal
        open={!!deactivating}
        title="Desactivar carrera"
        busy={busy}
        onClose={() => setDeactivating(null)}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setDeactivating(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                deactivating && void changeStatus(deactivating, false)
              }
            >
              Confirmar desactivación
            </Button>
          </>
        }
      >
        <p>
          La carrera <strong>{deactivating?.name}</strong> dejará de ofrecerse
          para nuevas selecciones. Los estudiantes y las convocatorias
          existentes conservarán sus asociaciones.
        </p>
        {mutationError && <div className="notice warning">{mutationError}</div>}
      </Modal>
    </div>
  )
}
