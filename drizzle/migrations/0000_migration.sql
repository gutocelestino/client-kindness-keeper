CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  full_name text NOT NULL,
  phone text,
  instagram text,
  email text,
  first_registered_at date DEFAULT current_date,
  last_visit_date date,
  return_frequency_days integer CHECK (return_frequency_days IS NULL OR return_frequency_days > 0),
  qualification text NOT NULL DEFAULT 'nao_avaliado' CHECK (qualification IN ('qualificado','nao_qualificado','nao_avaliado')),
  scissor_cut text NOT NULL DEFAULT 'nao_informado' CHECK (scissor_cut IN ('sim','nao','nao_informado')),
  client_type text CHECK (client_type IN ('ideal','assinante','nao_qualificado','outros')),
  brigadeiro text NOT NULL DEFAULT 'nao_informado' CHECK (brigadeiro IN ('sim','nao','nao_informado')),
  services text,
  notes text,
  extra_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_contact_at timestamptz,
  is_example boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clients select" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own clients insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own clients update" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own clients delete" ON public.clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  service text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own visits select" ON public.visits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own visits insert" ON public.visits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own visits update" ON public.visits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own visits delete" ON public.visits FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX visits_client_idx ON public.visits(client_id, visit_date DESC);

CREATE OR REPLACE FUNCTION public.sync_last_visit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; mx date;
BEGIN
  cid := COALESCE(NEW.client_id, OLD.client_id);
  SELECT max(visit_date) INTO mx FROM public.visits WHERE client_id = cid;
  IF mx IS NOT NULL THEN
    UPDATE public.clients SET last_visit_date = mx, updated_at = now() WHERE id = cid;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.client_id <> NEW.client_id THEN
    SELECT max(visit_date) INTO mx FROM public.visits WHERE client_id = OLD.client_id;
    UPDATE public.clients SET last_visit_date = mx WHERE id = OLD.client_id AND mx IS NOT NULL;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER visits_sync AFTER INSERT OR UPDATE OR DELETE ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.sync_last_visit();

CREATE OR REPLACE FUNCTION public.claim_unowned_data()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.clients SET user_id = NEW.id WHERE user_id IS NULL;
  UPDATE public.visits SET user_id = NEW.id WHERE user_id IS NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_claim AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.claim_unowned_data();

INSERT INTO public.clients (id, user_id, full_name, phone, instagram, email, first_registered_at, last_visit_date, return_frequency_days, client_type, services, notes, extra_fields, is_example) VALUES
('11111111-0000-0000-0000-000000000001', NULL, 'Vinicius Gori', '11 99842-2111', 'viniciusgori', NULL, NULL, '2026-09-26', NULL, 'ideal', 'Corte + Barba', 'Estamos quase fechando visagismo', '{"Visagismo?":"Não","N/ Atendimentos":"9"}', true),
('11111111-0000-0000-0000-000000000002', NULL, 'Thiago Henrique', '(11) 95298-3051', NULL, 'toesvlok@gmail.com', NULL, '2026-09-15', 15, 'ideal', 'Corte Express + Barba Express', NULL, '{"Visagismo?":"Não","N/ Atendimentos":"10","Dias Frequentados":"Terça - Quarta"}', true),
('11111111-0000-0000-0000-000000000003', NULL, 'Leandro Velozo', '(11) 98793-1080', NULL, 'leandrohzv@gmail.com', NULL, '2026-10-05', 25, 'ideal', 'Corte', 'Cliente com potencial de fechar visagismo', '{"Visagismo?":"Não","N/ Atendimentos":"1","Dias Frequentados":"Terça"}', true),
('11111111-0000-0000-0000-000000000004', NULL, 'Diego Ferreira', '(11) 97190-9233', NULL, 'diegoferreira5@gmail.com', NULL, '2026-10-05', 25, 'ideal', 'Corte', NULL, '{"Visagismo?":"Não","N/ Atendimentos":"7","Dias Frequentados":"Variado"}', true),
('11111111-0000-0000-0000-000000000005', NULL, 'Felipe Frade Pereira da Silva', '(11) 97026-3178', NULL, 'felipefradetrd@gmail.com', NULL, '2026-10-03', 25, 'ideal', 'Corte', 'Cliente com potencial de fechar visagismo', '{"Visagismo?":"Não","N/ Atendimentos":"1"}', true);

INSERT INTO public.visits (user_id, client_id, visit_date, service, note) VALUES
(NULL, '11111111-0000-0000-0000-000000000001', '2026-09-26', 'Corte + Barba', 'Importado da planilha'),
(NULL, '11111111-0000-0000-0000-000000000002', '2026-09-15', 'Corte Express + Barba Express', 'Importado da planilha'),
(NULL, '11111111-0000-0000-0000-000000000003', '2026-10-05', 'Corte', 'Importado da planilha'),
(NULL, '11111111-0000-0000-0000-000000000004', '2026-10-05', 'Corte', 'Importado da planilha'),
(NULL, '11111111-0000-0000-0000-000000000005', '2026-10-03', 'Corte', 'Importado da planilha');