export const userInclude = {
  role: true,
  student: { include: { career: true, cv: true, photo: true } },
  company: { include: { logo: true, resolver: { select: { name: true } } } },
}
export const roleName = (id) => ({ 1: "student", 2: "company", 3: "admin" })[id]
export const fileUrl = (id) => (id ? `/api/files/${id}` : undefined)
export function serializeUser(u) {
  const s = u.student,
    c = u.company
  return {
    id: String(u.id),
    role: roleName(u.roleId),
    name: u.name || c?.name || s?.name || "",
    email: u.email,
    emailVerified: u.emailVerified,
    registeredAt: u.registeredAt.toISOString(),
    ...(s
      ? {
          career: s.career.name,
          careerId: String(s.careerId),
          careerActive: s.career.active,
          matricula: s.matricula,
          university: s.university,
          phone: s.phone,
          bio: s.bio,
          photo: fileUrl(s.photoId),
          cvUrl: fileUrl(s.cvId),
          cvName: s.cv?.name,
          cvUpdatedAt: s.cvUpdatedAt?.toISOString(),
        }
      : {}),
    ...(c
      ? {
          name: c.name,
          rfc: c.rfc,
          contact: c.contact || u.email,
          phone: c.phone,
          bio: c.bio,
          giro: c.giro,
          address: c.address,
          hasUasAgreement: c.hasUasAgreement,
          approvalStatus: c.approvalStatus,
          rejectionReason: c.rejectionReason,
          resolvedAt: c.resolvedAt?.toISOString(),
          resolvedBy: c.resolver?.name,
          logo: fileUrl(c.logoId),
        }
      : {}),
  }
}
