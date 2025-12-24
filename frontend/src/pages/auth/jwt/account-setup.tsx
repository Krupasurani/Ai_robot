import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { User, Building } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription } from '@/components/ui/card';

import { OrgExists } from 'src/auth/context/jwt';
import AccountSetUpForm from 'src/auth/view/auth/account-setup';

// Account type interface
export type AccountType = 'individual' | 'business';

// ----------------------------------------------------------------------

const metadata = { title: 'Account Setup' };

export default function Page() {
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const navigate = useNavigate();


  useEffect(() => {
    const checkOrgExists = async () => {
      try {
        const response = await OrgExists();
        // Only redirect to sign-in if an organization already exists
        // If no org exists, stay on this page to allow account setup
        if (response.exists === true) {
          navigate('/auth/sign-in');
        }
        // If exists === false, do nothing - stay on setup page
      } catch (err) {
        console.error('Error checking if organization exists:', err);
        // On error, stay on setup page to allow first-time setup
      }
    };

    checkOrgExists();
    // eslint-disable-next-line
  }, []);



  const handleAccountTypeSelect = (type: AccountType) => {
    setAccountType(type);
  };

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      {/* Account Type Selection Card */}

      {accountType === null && (
        <Card className="m-8 rounded-[6px] dark:bg-card bg-[#f4f4f4] shadow-sm dark:shadow-gray-400/20  ">
          <CardHeader className="text-center pt-4 pb-2">
            <h1 className="font-[600] -mb-1 dark:text-white text-gray-900 text-xl">
              Choose Account Type
            </h1>

            <p className="text-sm text-gray-500">Select the type of account you want to create</p>
          </CardHeader>
          <CardContent className="flex flex-col  items-center justify-center gap-3">
            <div className="flex w-full  md:flex-col items-center gap-3 group transition-all duration-75 ease-in">
              <Card
                className="flex  w-full  p-4 cursor-pointer bg-[#f2f2f2] hover:bg-[#D5D5D5]/30 dark:bg-[#151516] dark:group-hover:bg-[#202020]/50 md:h-40"
                onClick={() => handleAccountTypeSelect('individual')}
              >
                <div className="bg-accent  w-fit p-2 rounded-lg group-hover:bg-accent/80">
                  <User size={26} className={cn('text-primary dark:text-gray-400 ')} />
                </div>

                <CardDescription className="mb-2">
                  <h1 className="text-lg font-bold dark:text-blue-400 dark:group-hover:text-blue-500 text-gray-900 ">
                    Individual
                  </h1>
                  <p className="dark:text-gray-500 text-gray-700 text-sm">
                    For personal use or freelancers
                  </p>
                </CardDescription>
              </Card>
            </div>
            <div className="flex w-full items-center gap-3 group ">
              <Card
                className="flex justify-center p-4 cursor-pointer dark:bg-[#151516] dark:group-hover:bg-[#202020]/50 w-full md:h-40 bg-[#f2f2f2] hover:bg-[#D5D5D5]/30"
                onClick={() => handleAccountTypeSelect('business')}
              >
                <div className="bg-accent w-fit p-2 rounded-lg group-hover:bg-accent/80">
                  <Building size={26} className={cn('text-primary dark:text-gray-400 ')} />
                </div>
                <CardDescription className="mb-2">
                  <h1 className="text-lg   dark:group-hover:text-blue-500 font-bold dark:text-blue-400 text-gray-900 ">
                    Organisation
                  </h1>
                  <p className="dark:text-gray-500 text-gray-700  text-sm">
                    For companies and teams
                  </p>
                </CardDescription>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render the AccountSetUpForm only after account type is selected */}
      {accountType && <AccountSetUpForm accountType={accountType} />}
    </>
  );
}
