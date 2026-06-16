
-- Avtomatik operator biriktirish (INSERT vaqtida)
DROP TRIGGER IF EXISTS trg_assign_operator ON public.leads;
CREATE TRIGGER trg_assign_operator
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.assign_operator_if_null();

-- Status o'zgarishini tarixga yozish (UPDATE vaqtida)
DROP TRIGGER IF EXISTS trg_status_change ON public.leads;
CREATE TRIGGER trg_status_change
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_status_change();
