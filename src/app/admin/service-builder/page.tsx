"use client";

// src/app/admin/service-builder/page.tsx

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ServiceConfig } from '@/types/service';

export default function ServiceBuilderPage() {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Service Builder</h1>
      <Link href="/admin/service-builder/create">
        <a className="inline-block mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
          + Create New Service
        </a>
      </Link>
      {loading ? (
        <p>Loading services...</p>
      ) : services.length === 0 ? (
        <p>No services defined yet.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <li key={svc.service.id} className="p-4 bg-white rounded shadow hover:shadow-lg transition">
              <h2 className="text-xl font-semibold text-indigo-700">{svc.service.name}</h2>
              <p className="text-gray-600">{svc.service.description}</p>
              <Link href={`/admin/service-builder/${svc.service.id}`}>
                <a className="text-sm text-indigo-500 hover:underline mt-2 block">Edit</a>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
