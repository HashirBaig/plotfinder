import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

import { ROLE_STYLES, type AppUser } from "../../lib/const";

type UsersTableProps = {
  data: AppUser[];
};

function UsersTable({ data }: UsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className=" text-gray-100">ID</TableHead>
          <TableHead className=" text-gray-100">Full Name</TableHead>
          <TableHead className=" text-gray-100">Email</TableHead>
          <TableHead className=" text-gray-100">Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="py-4">{user?.id}</TableCell>
            <TableCell className="font-medium py-4">{user.fullName}</TableCell>
            <TableCell className="py-4">{user?.email}</TableCell>
            <TableCell className="py-4">
              <Badge variant="outline" className={ROLE_STYLES[user?.role]}>
                {user?.role}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default UsersTable;
