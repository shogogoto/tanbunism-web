import { useNavigate } from "react-router";
import ConfirmDialogContent from "~/shared/components/ConfirmDialogContent";
import { useAuth } from "../AuthProvider";

export default function LogoutDialogContent() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  async function handleClick() {
    await signOut();
    navigate("/");
  }
  return (
    <ConfirmDialogContent
      title="ログアウト"
      handleClick={handleClick}
      keyboardNavigation
    />
  );
}
