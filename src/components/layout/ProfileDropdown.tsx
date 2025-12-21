import React from 'react';
import { Settings, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const ProfileDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuthContext();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: 'destructive',
        title: '로그아웃 실패',
        description: '다시 시도해주세요.',
      });
    } else {
      navigate('/auth');
    }
  };

  const handleSettings = () => {
    navigate('/my-profile');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 rounded-full bg-accent flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <User className="w-5 h-5 text-accent-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
        {profile?.full_name && (
          <>
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground truncate">
                {profile.full_name}
              </p>
              {profile.company_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {profile.company_name}
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" />
          Setting
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
