
import bcrypt from 'bcrypt';

class CryptoService {
  private saltRounds = 10;

  async hashPassword(password: string): Promise<string> {
    if (!password || typeof password !== 'string' || password.trim() === '') {
      throw new Error('Senha inválida ou vazia');
    }
    return await bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    if (!password || typeof password !== 'string' || password.trim() === '') {
      return false;
    }
    return await bcrypt.compare(password, hash);
  }
}

export const cryptoService = new CryptoService();
