"use client"

import React, { useEffect, useState } from 'react'

type Props = { address?: string | null; heightClass?: string }

export default function EnterpriseMap({ address, heightClass }: Props) {
  const [coords, setCoords] = useState<{ lat: string; lon: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!address) return
    setLoading(true)
    setError(null)
    const q = encodeURIComponent(address)
    // Use Nominatim public API for demo purposes. For production, proxy through server and cache.
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=0`
    fetch(url, {
      headers: {
        // friendly header; user-agent can't be set by browsers but referer will be present.
        'Accept': 'application/json'
      }
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: any[]) => {
        if (!mounted) return
        if (!data || data.length === 0) {
          setError('Géolocalisation non trouvée')
          return
        }
        const first = data[0]
        if (first && first.lat && first.lon) {
          setCoords({ lat: String(first.lat), lon: String(first.lon) })
        } else {
          setError('Résultat invalide')
        }
      })
      .catch((err) => {
        if (!mounted) return
        console.error('EnterpriseMap geocode error', err)
        setError('Erreur de géolocalisation')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [address])

  if (!address) return <div className="text-sm text-muted-foreground">Adresse non renseignée.</div>
  if (loading) return <div className="text-sm text-muted-foreground">Localisation en cours…</div>
  if (error) return <div className="text-sm text-destructive">{error}</div>
  if (!coords) return null

  const { lat, lon } = coords
  // construct a bbox around the point for the embed view
  const delta = 0.01
  const left = Number(lon) - delta
  const right = Number(lon) + delta
  const bottom = Number(lat) - delta
  const top = Number(lat) + delta
  const bbox = `${left}%2C${bottom}%2C${right}%2C${top}`
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`
  const openUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`

  return (
    <div className={`w-full ${heightClass ?? 'h-44'} rounded-md overflow-hidden border border-border/50`}>
      <iframe
        title="Localisation de l'entreprise"
        src={embedUrl}
        className="w-full h-full"
        style={{ border: 0 }}
        loading="lazy"
      />
      <div className="p-2 text-xs text-muted-foreground flex items-center justify-between">
        <div>Coordonnées: {lat}, {lon}</div>
        <a className="text-primary underline text-sm" href={openUrl} target="_blank" rel="noreferrer">Ouvrir dans OSM</a>
      </div>
    </div>
  )
}
