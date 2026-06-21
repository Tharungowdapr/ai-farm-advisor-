export const GrainOverlay = () => <div className="grain-overlay opacity-30" />;

export const SectionLabel = ({ text, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-6 opacity-60">
    {Icon && <Icon size={12} className="text-[#84cc16]" />}
    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#0c0a09]">{text}</span>
  </div>
);
