'use client'

import { IconUser } from './icons'

interface Researcher {
  id: number
  name: string
  role: string
  email: string
  avatarColor: string
  avatarAlt: string
}

const researchers: Researcher[] = [
  {
    id: 1,
    name: 'Kristian Bautista',
    role: 'Project Manager',
    email: 'kristiandavidbautista@gmail.com',
    avatarColor: 'bg-civiq-purple',
    avatarAlt: '3D Avatar - Kristian David Bautista',
  },
  {
    id: 2,
    name: 'Angel Letada',
    role: 'SUMO Engineer',
    email: 'angel.letada1205@gmail.com',
    avatarColor: 'bg-civiq-blue',
    avatarAlt: '3D Avatar - Angel Letada',
  },
  {
    id: 3,
    name: 'Michael Pascual',
    role: 'SUMO Engineer',
    email: 'michaelkevinpascual47@gmail.com',
    avatarColor: 'bg-[#8B5FBF]',
    avatarAlt: '3D Avatar - Michael Pascual',
  },
  {
    id: 4,
    name: 'Marianne Santos',
    role: 'Software Engineer',
    email: 'mariannesantos174@gmail.com',
    avatarColor: 'bg-[#5DADE2]',
    avatarAlt: '3D Avatar - Marianne Santos',
  },
]

export const ResearchersSection = () => {
  return (
    <div className="w-full">
      <h2 className="font-bold text-civiq-purple text-[48px] mb-16 text-center">
        The Researchers
      </h2>

      <div className="grid grid-cols-4 gap-12">
        {researchers.map((researcher) => (
          <div
            key={researcher.id}
            className="flex flex-col items-center"
          >
            {/* Avatar */}
            <div className={`relative size-[140px] rounded-full overflow-hidden ${researcher.avatarColor} shadow-[0px_8px_16px_0px_rgba(0,0,0,0.15)] mb-8 border-4 border-white hover:shadow-[0px_12px_24px_0px_rgba(0,0,0,0.2)] transition-shadow flex items-center justify-center`}>
              <IconUser className="text-white" size={64} />
            </div>

            {/* Card */}
            <div className="bg-[#f6f6f6] rounded-[35px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-8 text-center w-full hover:shadow-[0px_8px_12px_0px_rgba(0,0,0,0.15)] transition-shadow">
              <p className="font-bold text-civiq-dark text-[22px] mb-3">
                {researcher.name}
              </p>
              <p className="font-normal italic text-civiq-dark text-[16px] mb-6">
                {researcher.role}
              </p>
              <a
                href={`mailto:${researcher.email}`}
                className="font-normal text-civiq-dark text-[13px] hover:text-civiq-blue transition-colors whitespace-nowrap text-ellipsis overflow-hidden block"
              >
                {researcher.email}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
