import { BagUiNavbar } from './BagUiNavbar'

export default function BagUiNavbarDemo() {
  return (
    <div className="min-h-[500px] w-full bg-slate-50 dark:bg-black p-6 flex flex-col items-center">
      <BagUiNavbar
        onSignIn={() => alert('Sign In clicked')}
        onRequestDemo={() => alert('Request Demo clicked')}
        onLaunchApp={() => alert('Launch App clicked')}
      />
      <div className="mt-20 text-center text-sm text-gray-500">
        Click <strong className="text-gray-900 dark:text-white">Pricing</strong>,{' '}
        <strong className="text-gray-900 dark:text-white">Solutions</strong>, or{' '}
        <strong className="text-gray-900 dark:text-white">Resources</strong> to explore the Bag\Ui mega-menu dropdowns.
      </div>
    </div>
  )
}
