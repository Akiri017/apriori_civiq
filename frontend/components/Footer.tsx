'use client'

export const Footer = () => {
  return (
    <footer className="bg-civiq-purple text-white">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Top section with logo and social icons */}
        <div className="flex items-center gap-8 mb-12 pb-12 border-b border-white border-opacity-20">
          <div className="relative size-[55px] flex-shrink-0">
            <img
              alt="Civiq Logo"
              className="object-cover"
              src="http://localhost:3845/assets/bf3344aa58467d40fc78bdfe6536dfaf33b3fe5d.png"
            />
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:opacity-80 transition-opacity">
              <img
                alt="GitHub"
                src="http://localhost:3845/assets/61b69eaf2118d2a93f0be78a31a7d8d2c5a7539b.svg"
                className="w-6 h-6"
              />
            </a>
            <a href="#" className="hover:opacity-80 transition-opacity">
              <img
                alt="Dribbble"
                src="http://localhost:3845/assets/e98216c369e6340441911c478845f4b503a9ae09.svg"
                className="w-6 h-6"
              />
            </a>
            <a href="#" className="hover:opacity-80 transition-opacity">
              <img
                alt="LinkedIn"
                src="http://localhost:3845/assets/e55ed438c0a2f8a926111132551250108a656370.svg"
                className="w-6 h-6"
              />
            </a>
          </div>
        </div>

        {/* Links section */}
        <div className="grid grid-cols-2 gap-16 mb-12">
          {/* Explore */}
          <div>
            <h3 className="font-bold text-white text-[20px] mb-6">Explore</h3>
            <ul className="space-y-4 text-white text-[20px]">
              <li><a href="#" className="hover:opacity-80 transition-opacity">Selfish Routing</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Monolithic QMIX</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Civiq</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold text-white text-[20px] mb-6">Resources</h3>
            <ul className="space-y-4 text-white text-[20px]">
              <li><a href="#" className="hover:opacity-80 transition-opacity">About Civiq</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">The Researchers</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Research Paper</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="bg-civiq-dark py-6 px-8 rounded-lg text-center -mx-8 -mb-12">
          <p className="font-normal italic text-white text-[15px]">
            A Priori Group. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
