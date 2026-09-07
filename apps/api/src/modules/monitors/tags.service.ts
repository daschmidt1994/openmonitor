import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@openmonitor/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../../common/guards/auth.guard";
import type { CreateTagDto } from "./dto/create-tag.dto";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });
  }

  async create(user: AuthenticatedUser, dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({ where: { userId_name: { userId: user.id, name: dto.name } } });
    if (existing) throw new ConflictException("A tag with this name already exists");
    return this.prisma.tag.create({ data: { userId: user.id, name: dto.name, color: dto.color ?? "#64748b" } });
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag || (tag.userId !== user.id && user.role !== Role.ADMIN)) {
      throw new NotFoundException("Tag not found");
    }
    await this.prisma.tag.delete({ where: { id: tag.id } });
  }
}
