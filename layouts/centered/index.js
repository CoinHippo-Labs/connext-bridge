export default function Centered({ children }) {
  return (
    <div
      data-layout="centered"
      className="w-full min-h-screen bg-gray-50 flex items-center justify-center"
    >
      {children}
    </div>
  )
}